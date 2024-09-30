import {
  CallbackShare,
  FunctionClass,
  isObjectMethod,
  MapCallback,
  SetWithInnerKey,
  ValueCallback,
  VoidCallback
} from '../core';
import { ServiceType } from './service-type';
import { ServiceDescriptor } from './service-descriptor';
import { ServiceBehavior } from './service-behavior';
import { ServiceScope } from './service-scope';
import { remapBehaviorInheritance, validateBehaviorDependency, validateCircularDependency } from './_procedure';
import { ServiceFactoryFunction } from './service-factory';

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
   */
  <T>(type: ServiceType<T>): T;

  /**
   * @inheritdoc
   */
  <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
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
    super(<T>(serviceType: ServiceType<T>, callback?: ValueCallback<T>): unknown => {
      if (callback) {
        return provide(serviceType, callback);
      }

      let done = false;
      let value: T | undefined = undefined;
      provide(serviceType, (value2) => {
        done = true;
        value = value2;
      });
      if (done) {
        return value as T;
      }
      throw new Error(`Service(${ServiceType.toString(serviceType)}) is not synchronous. Add callback() to provide(..., callback) instead.`);
    });
    this._original = provide;
  }
}

export interface ServiceProvider extends ServiceProviderWithReturnFunction {
  /**
   * @inheritdoc
   */
  <T>(type: ServiceType<T>): T;

  /**
   * @inheritdoc
   */
  <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
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

  private readonly _services = new SetWithInnerKey<ServiceDescriptor, ServiceType>(x => x.type);

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

  constructor(services: Iterable<ServiceDescriptor>, scope?: ServiceScope) {
    const withReturn = new ServiceProviderWithReturn((type, callback) => this.provide(type, callback));
    super(withReturn);
    this._scope = scope;
    this._withReturn = withReturn;

    if (!(services instanceof ServiceProvider)) { // todo: maybe refactor
      const array = remapBehaviorInheritance(services);
      array.forEach((descriptor: ServiceDescriptor) => {
        this._services.add(descriptor);
        this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
      });
      array.unshift(ServiceDescriptor.fromValue(ServiceProvider, this));
      validateCircularDependency(array);
      validateBehaviorDependency(array);
      this._singletons = new Map();
      this._callbackShare = new CallbackShare();
    } else {
      this._services = services._services;
      this._runtimeMap = services._runtimeMap;
      // this._sourcedFrom = services;
      this._singletons = services._singletons;
      this._callbackShare = services._callbackShare;
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
    return this._services.innerMap.has(type);
  }

  // validateDependencies<T extends object, K extends keyof T>(type: Type<T>, propertyKey: K): void {
  //   const methodResolver = _ServiceMethodResolver.from(type, propertyKey as string | symbol);
  //   methodResolver.dependencies.forEach((dep, index) => { // validate dependencies
  //     if (!this.has(dep)) {
  //       throw new Error(`Unknown param source at ${type.name}#${String(propertyKey)}(...[${index}]: ${ServiceType.toString(dep)})`);
  //     }
  //   });
  // }

  touchAllSingletons(callback: VoidCallback): void {
    const descriptors: ServiceDescriptor[] = [];
    this._services.forEach(descriptor => {
      if (ServiceBehavior.Singleton === descriptor.behavior && !this._singletons.has(descriptor.type)) {
        descriptors.push(descriptor);
      }
    });

    this.provideAll(descriptors.map(x => x.type), () => callback());
  }

  makeScopedProvider(): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    return new ServiceProvider(this, new ServiceScope());
  }

  destroyScope(): void {
    if (!this.scope) {
      throw new Error('No defined scope');
    }

    const scope = this.scope;
    delete this._scope;

    scope.forEach(value => {
      if (isObjectMethod(value, 'onScopeDestroy')) {
        value['onScopeDestroy']();
      }
    });
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._services[Symbol.iterator]();
  }
}
