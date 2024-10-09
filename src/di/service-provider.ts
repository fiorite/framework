import {
  CallbackForceValueError,
  CallbackShare,
  emptyCallback,
  forceCallbackValue,
  FunctionClass,
  isObjectMethod,
  MapCallback,
  ValueCallback,
  VoidCallback
} from '../core';
import { ServiceType } from './service-type';
import { ServiceDescriptor } from './service-descriptor';
import { ServiceBehavior } from './service-behavior';
import { ServiceScope } from './service-scope';
import { ServiceFactoryFunction } from './service-factory';
import { iterableForEach } from '../iterable';
import { ServiceSet } from './service-set';

/**
 * Service provider is build on callbacks.
 * See {@link ServiceProviderWithReturnFunction} signature.
 *
 * Using {@link Promise} instead of callback (idea):
 * @example ```typescript
 *  const provideAsync = <T>(provide: ServiceProvideFunction, type: ServiceType<T>): Promise<T> => {
 *    return new Promise((resolve, reject) => {
 *      try {
 *        provide(type, resolve);
 *      } catch(err) {
 *        reject(err);
 *      }
 *    });
 *  };
 * ```
 */
export interface ServiceProvideFunction {
  /**
   * Core function which accepts service {@link type} and resolves it with {@link callback}.
   * @param type
   * @param callback
   */<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

/**
 * Provide with return is an attempt to catch a synchronous value out of provide callback.
 * Side effect is {@link Error} throw when service is asynchronous.
 */
export interface ServiceProviderWithReturnFunction extends ServiceProvideFunction {
  /**
   * @throws Error when unable to catch a value, thus service considered to be asynchronous.
   */<T>(type: ServiceType<T>): T;
}

/**
 * @mixin ServiceProviderWithReturn
 */
export interface ServiceProviderWithReturn extends ServiceProviderWithReturnFunction {
  /**
   * @inheritdoc
   */<T>(type: ServiceType<T>): T;

  /**
   * @inheritdoc
   */<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class NotSynchronousServiceError {
  readonly name = 'AsynchronousServiceError';
  readonly message: string;

  constructor(type: ServiceType) {
    this.message = `Service(${ServiceType.toString(type)}) is not synchronous. Add callback() to provide(..., callback) instead.`;
  }
}

/**
 * Implementor of {@link ServiceProviderWithReturnFunction} which wraps raw {@link ServiceProvideFunction}.
 */
export class ServiceProviderWithReturn extends FunctionClass<ServiceProviderWithReturnFunction> {
  /**
   * Original implementation of {@link ServiceProvideFunction}.
   * @private
   */
  private readonly _original: ServiceProvideFunction;

  get original(): ServiceProvideFunction {
    return this._original;
  }

  constructor(provide: ServiceProvideFunction) {
    super(<T>(type: ServiceType<T>, callback?: ValueCallback<T>): unknown => {
      if (callback) {
        return provide(type, callback);
      }

      try {
        return forceCallbackValue(catcher => provide(type, catcher));
      } catch (error) {
        if (error instanceof CallbackForceValueError) {
          throw new NotSynchronousServiceError(type);
        }
        throw error;
      }
    });
    this._original = provide;
  }
}

export interface ServiceProvider extends ServiceProviderWithReturnFunction {
  /**
   * @inheritdoc
   */<T>(type: ServiceType<T>): T;

  /**
   * @inheritdoc
   */<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class ServiceNotFoundError implements Error {
  readonly name = 'ServiceNotFound';
  readonly message: string;

  constructor(readonly type: ServiceType) {
    this.message = 'service is not found: ' + ServiceType.toString(type);
  }
}

/**
 * @internal
 */
type ServiceFactoryFunctionWithProvider<T = unknown> = (provider: ServiceProvider, callback: ValueCallback<T>) => void;

export interface OnScopeDestroy {
  onScopeDestroy(): void;
}

export class ServiceProvider extends FunctionClass<ServiceProviderWithReturnFunction> implements Iterable<ServiceDescriptor> {
  private static _behaviorFactories: Record<ServiceBehavior, MapCallback<ServiceDescriptor, ServiceFactoryFunctionWithProvider>> = {
    [ServiceBehavior.Inherited]: () => {
      return (_, descriptor): never => {
        throw new Error('inherited service is not re-mapped: ' + descriptor.toString());
      };
    },
    [ServiceBehavior.Singleton]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => {
        if (provider._singletons.has(descriptor.type)) {
          return callback(provider._singletons.get(descriptor.type));
        }

        return provider._callbackShare(ServiceType.toString(descriptor.type), fulfill => {
          descriptor.factory(provider.provide.bind(provider), fulfill);
        }, value => {
          provider._singletons.set(descriptor.type, value);
          callback(value);
        });
      };
    },
    [ServiceBehavior.Scoped]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => {
        if (!provider.scope) {
          throw new Error('Scope is not defined. Use #createScope()');
        }

        return provider.scope.through(
          descriptor.type,
          resolve => descriptor.factory(provider.provide.bind(provider), resolve),
          callback
        );
      };
    },
    [ServiceBehavior.Prototype]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => descriptor.factory(provider.provide.bind(provider), callback);
    },
  };

  static createScoped(from: ServiceProvider): ServiceProvider {
    if (from._scope) {
      throw new Error('ServiceProvider has Scope already.');
    }

    const scoped = new ServiceProvider(from);
    scoped._scope = new ServiceScope();
    return scoped;
  }

  static destroyScoped(of: ServiceProvider): void {
    if (!of._scope) {
      throw new Error('ServiceProvider has no Scope.');
    }

    const scope = of._scope;
    delete of._scope;

    iterableForEach<[ServiceType, unknown]>(entry => {
      if (isObjectMethod(entry[1], 'onScopeDestroy')) {
        entry[1]['onScopeDestroy']();
      }
    })(scope);
  }

  private readonly _singletons: Map<ServiceType, unknown>;

  private readonly _callbackShare: CallbackShare;

  private _scope?: ServiceScope;

  get scope(): ServiceScope | undefined {
    return this._scope;
  }

  private readonly _withReturn: ServiceProviderWithReturn;

  get withReturn(): ServiceProviderWithReturn {
    return this._withReturn;
  }

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunctionWithProvider>;

  private readonly _descriptors: ServiceSet;

  get descriptors(): ServiceSet {
    return this._descriptors;
  }

  private _touchAddedSingletons?: boolean;

  constructor(descriptors: Iterable<ServiceDescriptor>) {
    const withReturn = new ServiceProviderWithReturn((type, callback) => this.provide(type, callback));
    super(withReturn);
    this._withReturn = withReturn;

    if (!(descriptors instanceof ServiceProvider)) { // todo: maybe refactor
      this._descriptors = new ServiceSet(descriptors, {
        add: descriptor => {
          if (descriptor.inherited) {
            this._makeBehaviorInheritance(descriptor).forEach(resolvedDescriptor => {
              descriptor = resolvedDescriptor;
              this._descriptors.replaceInherited(resolvedDescriptor);
            });
          }

          this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
          this._checkCircularDependencies(descriptor);
          this._checkBehaviourDependencies(descriptor);

          if (this._touchAddedSingletons && descriptor.singleton) {
            this.provide(descriptor.type, emptyCallback);
          }
        },
        delete: descriptor => {
          if (this._mentionedInDependencies(descriptor)) {
            throw new Error('Service is listed as a dependency. Unable to process descriptor deletion.');
          }

          this._runtimeMap.delete(descriptor.type);

          if ( // delete singleton instance
            descriptor.singleton && this._singletons.has(descriptor.type)
          ) {
            this._singletons.delete(descriptor.type);
          }
        },
        clear: () => this._runtimeMap.clear(),
      });

      this._makeBehaviorInheritance().forEach(newDescriptor => this._descriptors.replaceInherited(newDescriptor));
      this._descriptors.forEach((descriptor: ServiceDescriptor) => {
        this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
      });
      this._checkCircularDependencies();
      this._checkBehaviourDependencies();
      this._singletons = new Map();
      this._callbackShare = new CallbackShare();
    } else {
      this._descriptors = descriptors._descriptors;
      this._runtimeMap = descriptors._runtimeMap;
      this._singletons = descriptors._singletons;
      this._callbackShare = descriptors._callbackShare;
    }

    this._runtimeMap.set(ServiceProvider, (_, callback) => callback(this));
  }

  /**
   * Raw implementation or {@link ServiceProvideFunction}.
   */
  provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const behaviorFactory = this._runtimeMap.get(type) as ServiceFactoryFunctionWithProvider<T> | undefined;

    if (undefined === behaviorFactory) {
      throw new ServiceNotFoundError(type);
    }

    return behaviorFactory(this, callback);
  }

  provideAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.all(array)(this.provide.bind(this), callback);
  }

  has(type: ServiceType): boolean {
    return this._descriptors.containsType(type);
  }

  // region procedures

  private _dependenciesToDescriptors(descriptor: ServiceDescriptor): ServiceDescriptor[] {
    return descriptor.dependencies.filter(x => x !== ServiceProvider).map(type => {
      const x = this._descriptors.findDescriptor(type);
      if (!x) {
        throw new Error('Missing dependency: ' + ServiceType.toString(type));
      }
      return x;
    });
  }

  private _makeBehaviorInheritance(...descriptors: ServiceDescriptor[]): ServiceDescriptor[] {
    const result: ServiceDescriptor[] = [];
    const queue: ServiceDescriptor[] = [];

    if (descriptors.length) {
      if (descriptors.some(x => !x.inherited)) {
        throw new Error('requested service is not inherited');
      }
      queue.push(...descriptors);
    } else {
      this._descriptors.forEach(descriptor => {
        if (descriptor.inherited) {
          queue.push(descriptor);
        }
      });
    }

    while (queue.length) {
      const descriptor1 = queue.shift()!;
      const dependencies = descriptor1.dependencies.map(type => {
        const index = result.findIndex(x => x.type === type);
        if (index > -1) {
          return result[index];
        }
        const x = this._descriptors.findDescriptor(type);
        if (!x) {
          throw new Error('Missing dependency: ' + ServiceType.toString(type));
        }
        return x;
      });

      const inheritedDeps = dependencies.filter(x => x.inherited);
      if (inheritedDeps.length) {
        inheritedDeps.forEach(inheritedDescriptor => { // clean queue
          const index = queue.findIndex(x => x.type === inheritedDescriptor.type);
          queue.splice(index, 1);
        });

        // put dependencies first and current descriptor in the end.
        queue.unshift(...inheritedDeps, descriptor1);
      } else {
        const behaviorToInherit = dependencies.some(dependency => dependency.scoped) ?
          ServiceBehavior.Scoped : ServiceBehavior.Singleton;
        result.push(descriptor1.inherit(behaviorToInherit));
      }
    }

    return result;
  }

  private _checkCircularDependencies(...descriptors: ServiceDescriptor[]): void {
    const queue1 = descriptors.length ? descriptors : Array.from(this);

    while (queue1.length) {
      const declaration1 = queue1.shift()!;
      const queue2 = this._dependenciesToDescriptors(declaration1);

      while (queue2.length) {
        const declaration2 = queue2.shift()!;
        if (declaration2.type === declaration1.type) {
          throw new Error('Circular dependency detected: ' + ServiceType.toString(declaration1.type));
        }
        queue2.unshift(...this._dependenciesToDescriptors(declaration2));
      }
    }
  }

  private _checkBehaviourDependencies(...descriptors: ServiceDescriptor[]): void {
    const queue1 = descriptors.length ? descriptors : Array.from(this);

    while (queue1.length) {
      const declaration = queue1.shift()!;
      const dependencies = this._dependenciesToDescriptors(declaration);

      const index1 = dependencies.findIndex(x => x.inherited);
      if (index1 > -1) {
        const dependency1 = dependencies[index1];
        throw new Error('Inherit behavior is not resolved: ' + ServiceType.toString(dependency1.type));
      }

      if (declaration.singleton) {
        const index2 = dependencies.findIndex(x => x.scoped);
        if (index2 > -1) {
          const dependency2 = dependencies[index2];
          throw new Error(`Faulty behavior dependency. Singleton (${ServiceType.toString(declaration.type)}) cannot depend on Scope (${ServiceType.toString(dependency2.type)}) behavior.`);
        }
      }
    }
  }

  // validateDependencies<T extends object, K extends keyof T>(type: Type<T>, propertyKey: K): void {
  //   const methodResolver = _ServiceMethodResolver.from(type, propertyKey as string | symbol);
  //   methodResolver.dependencies.forEach((dep, index) => { // validate dependencies
  //     if (!this.has(dep)) {
  //       throw new Error(`Unknown param source at ${type.name}#${String(propertyKey)}(...[${index}]: ${ServiceType.toString(dep)})`);
  //     }
  //   });
  // }

  private _mentionedInDependencies(dependency: ServiceDescriptor): boolean {
    for (const descriptor of this._descriptors) {
      if (descriptor.dependencies.includes(dependency.type)) {
        return true;
      }
    }
    return false;
  }

  // endregion

  touchAllSingletons(callback: VoidCallback): void {
    this._touchAddedSingletons = true;

    const descriptors: ServiceDescriptor[] = [];
    this._descriptors.forEach(descriptor => {
      if (descriptor.singleton && !this._singletons.has(descriptor.type)) {
        descriptors.push(descriptor);
      }
    });

    this.provideAll(descriptors.map(x => x.type), () => callback());
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._descriptors[Symbol.iterator]();
  }
}

