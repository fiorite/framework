import {
  AbstractType,
  CallbackForceValueError,
  CallbackShare,
  DecoratorOuterFunction,
  DecoratorRecorder,
  emptyCallback,
  forceCallbackValue,
  FunctionClass,
  isObjectMethod,
  isType,
  MapCallback,
  Type,
  ValueCallback,
  VoidCallback
} from '../core';
import { ServiceType } from './service-type';
import { ServiceDescriptor } from './service-descriptor';
import { ServiceBehavior } from './service-behavior';
import { ServiceScope } from './service-scope';
import { ServiceFactoryFunction, ServiceFactoryWithReturnFunction } from './service-factory';
import { iterableForEach } from '../iterable';
import { ServiceSet } from './service-set';
import { BehaveLike } from './decorators';

/**
 * Dependency injection is built with the help of callbacks.
 * See {@link ServiceProvideFunction} signature.
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
 * Core function which accepts service {@link type} and resolves it with {@link callback}.
 */
export type ServiceProvideCallback = <T>(type: ServiceType<T>, then: ValueCallback<T>) => void;

/**
 * Provide with return is an attempt to catch a synchronous value out of provide callback.
 * Side effect is {@link Error} throw when service is asynchronous.
 *
 * @throws Error when unable to catch a value, thus service considered to be asynchronous, unless one uses callback overload.
 */
export interface ServiceProvideFunction extends ServiceProvideCallback {
  <T>(type: ServiceType<T>): T;
}

export type ServiceProvideAsyncFunction = <T>(type: ServiceType<T>) => PromiseLike<T>;

export class NotSynchronousServiceError {
  readonly name = 'AsynchronousServiceError';
  readonly message: string;

  constructor(type: ServiceType) {
    this.message = `Service(${ServiceType.toString(type)}) is not synchronous. Add callback() to provide(..., callback) instead.`;
  }
}

export interface ServiceProvider extends ServiceProvideFunction {
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

export class ServiceProvider extends FunctionClass<ServiceProvideFunction> implements Iterable<ServiceDescriptor> {
  private static _behaviorFactories: Record<ServiceBehavior, MapCallback<ServiceDescriptor, ServiceFactoryFunctionWithProvider>> = {
    [ServiceBehavior.Inherited]: (descriptor) => {
      return (provider, callback): void => {
        provider._makeBehaviorInheritance(descriptor).forEach(resolvedDescriptor => {
          descriptor = resolvedDescriptor;
          provider._descriptors.replaceInherited(resolvedDescriptor);
        });

        descriptor = provider._descriptors.findDescriptor(descriptor.type)!;

        const factoryToSet = ServiceProvider._behaviorFactories[descriptor.behavior](descriptor);
        provider._runtimeMap.set(descriptor.type, factoryToSet);
        return factoryToSet(provider, callback);
      };
    },
    [ServiceBehavior.Singleton]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => {
        if (provider._singletons.has(descriptor.type)) {
          return callback(provider._singletons.get(descriptor.type));
        }

        return provider._callbackShare(ServiceType.toString(descriptor.type), fulfill => {
          descriptor.factory(provider._provide.bind(provider), fulfill);
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
          resolve => descriptor.factory(provider._provide.bind(provider), resolve),
          callback
        );
      };
    },
    [ServiceBehavior.Prototype]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => descriptor.factory(provider._provide.bind(provider), callback);
    },
  };

  static createWithScope(from: ServiceProvider): ServiceProvider {
    if (from._scope) {
      throw new Error('ServiceProvider has Scope already.');
    }

    const scoped = new ServiceProvider(from);
    scoped._scope = new ServiceScope();
    return scoped;
  }

  static destroyScope(of: ServiceProvider): void {
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

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunctionWithProvider>;

  private readonly _descriptors: ServiceSet;

  private _preCacheSingletons?: boolean;

  private _behavioralMap: Map<Type, ServiceBehavior> = new Map(
    DecoratorRecorder.classSearch(BehaveLike).map(d => [d.path[0] as Type, d.payload])
  );

  constructor(descriptors: Iterable<ServiceDescriptor> = []) {
    super((...args: unknown[]) => (this.get as Function)(...args));

    if (!(descriptors instanceof ServiceProvider)) { // todo: maybe refactor
      this._descriptors = new ServiceSet(descriptors, {
        add: descriptor => {
          this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
          if (this._preCacheSingletons && descriptor.isSingleton) {
            this._provide(descriptor.type, emptyCallback);
          }
        },
        delete: descriptor => {
          if (this._mentionedInDependencies(descriptor)) {
            throw new Error('Service is listed as a dependency. Unable to process descriptor deletion.');
          }

          this._runtimeMap.delete(descriptor.type);

          if ( // delete singleton instance
            descriptor.isSingleton && this._singletons.has(descriptor.type)
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
   * @deprecated method to process all the checks.
   */
  _performStabilityCheck(): void {
    this._checkCircularDependencies();
    this._checkBehaviourDependencies();
  }

  /**
   * Raw {@link ServiceProvideCallback}, used internally.
   */
  private _provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const behaviorFactory = this._runtimeMap.get(type) as ServiceFactoryFunctionWithProvider<T> | undefined;

    if (undefined === behaviorFactory) {
      throw new ServiceNotFoundError(type);
    }

    return behaviorFactory(this, callback);
  }

  get<T>(type: ServiceType<T>): T;
  get<T>(type: ServiceType<T>, then: ValueCallback<T>): void;
  get(type: ServiceType, callback?: ValueCallback<unknown>): unknown {
    if (callback) {
      return this._provide(type, callback);
    }

    try {
      return forceCallbackValue(complete => this._provide(type, complete));
    } catch (error) {
      if (error instanceof CallbackForceValueError) {
        throw new NotSynchronousServiceError(type);
      }
      throw error;
    }
  }

  getAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.all(array)(this._provide.bind(this), callback);
  }

  async<T>(type: ServiceType<T>): PromiseLike<T> {
    return new Promise((resolve, reject) => {
      try {
        this._provide(type, resolve);
      } catch (err) {
        reject(err);
      }
    });
  }

  asyncAll(array: ServiceType[]): PromiseLike<unknown[]> {
    return Promise.all(
      array.map(type => this.async(type))
    );
  }

  // todo: add set which will forcefully set the service unless there no dependency done on it.
  // think of rebuilding stuff, will likely not work.

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
      if (descriptors.some(x => !x.isInherited)) {
        throw new Error('requested service is not inherited');
      }
      queue.push(...descriptors);
    } else {
      this._descriptors.forEach(descriptor => {
        if (descriptor.isInherited) {
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

      const inheritedDeps = dependencies.filter(x => x.isInherited);
      if (inheritedDeps.length) {
        inheritedDeps.forEach(inheritedDescriptor => { // clean queue
          const index = queue.findIndex(x => x.type === inheritedDescriptor.type);
          queue.splice(index, 1);
        });

        // put dependencies first and current descriptor in the end.
        queue.unshift(...inheritedDeps, descriptor1);
      } else {
        const behaviorToInherit = dependencies.some(dependency => dependency.isScoped) ?
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

      // const index1 = dependencies.findIndex(x => x.inherited);
      // if (index1 > -1) {
      //   const dependency1 = dependencies[index1];
      //   throw new Error('Inherit behavior is not resolved: ' + ServiceType.toString(dependency1.type));
      // }

      if (declaration.isSingleton) {
        const index2 = dependencies.findIndex(x => x.isScoped);
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

  preCacheSingletons(callback: VoidCallback): void {
    this._preCacheSingletons = true;

    const descriptors: ServiceDescriptor[] = [];
    this._descriptors.forEach(descriptor => {
      if (descriptor.isSingleton && !this._singletons.has(descriptor.type)) {
        descriptors.push(descriptor);
      }
    });

    this.getAll(descriptors.map(x => x.type), () => callback());
  }

  // region add a new service

  add(object: object): this;
  add<T>(serviceType: ServiceType<T>, object: T): this;
  add(type: Type): this;
  add<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): this;
  add(...args: unknown[]): this {
    if (args.length === 1) {
      if (isType(args[0])) {
        return this.addType(args[0] as Type);
      }

      return this.addValue(args[0] as object);
    }

    if (args.length > 1 && isType(args[1])) {
      return this.addType(args[0] as ServiceType, args[1] as Type, args[2] as ServiceBehavior);
    }

    return this.addValue(args[0] as Type, args[1] as object);
  }

  addDecoratedBy(...decorators: DecoratorOuterFunction<ClassDecorator>[]): this {
    decorators.flatMap(decorator => DecoratorRecorder.classSearch(decorator).map(x => x.path[0]))
      .filter(type => !this._descriptors.containsType(type))
      .forEach(type => this.addType(type as Type));
    return this;
  }

  addMissingDependencies(): this {
    const queue = Array.from(this);
    while (queue.length) {
      const descriptor = queue.shift()!;
      descriptor.dependencies
        .filter(dependency => !this._descriptors.containsType(dependency) && dependency !== ServiceProvider)
        .filter(isType)
        .map(type => this._addType(type))
        .forEach(descriptor2 => queue.push(descriptor2));
    }
    return this;
  }

  addType(type: Type): this;
  addType<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): this;
  addType(...args: unknown[]): this {
    if (args.length === 1) {
      this._addType(args[0] as Type);
    } else {
      this._addType(args[1] as Type, args[0] as ServiceType, args[2] as ServiceBehavior);
    }
    return this;
  }

  private _addType<T>(implementation: Type<T>, type: ServiceType<T> = implementation, behavior?: ServiceBehavior): ServiceDescriptor {
    if (!behavior) {
      behavior = this._behavioralMap.get(implementation) || ServiceBehavior.Inherited;
    }

    const descriptor = ServiceDescriptor.fromType(type, implementation, behavior);
    this._descriptors.add(descriptor);
    return descriptor;
  }

  addFactory<T>(
    type: ServiceType<T>,
    factory: ServiceFactoryWithReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): this {
    const descriptor = ServiceDescriptor.fromFactory(type, factory, dependencies, behavior);
    this._descriptors.add(descriptor);
    return this;
  }

  addValue(object: object): this;
  addValue<T>(serviceType: ServiceType<T>, object: T): this;
  addValue(...args: unknown[]): this {
    this._descriptors.add(
      args.length === 1 ? ServiceDescriptor.fromValue(args[0] as object) :
        ServiceDescriptor.fromValue(args[0] as ServiceType<object>, args[1] as object)
    );
    return this;
  }

  addInherited(type: Type): this;
  addInherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
  addInherited(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Inherited);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Inherited);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Inherited
    );
  }

  addSingleton(type: Type): this;
  addSingleton<T>(type: ServiceType<T>, value: T): this;
  addSingleton<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addSingleton<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
  addSingleton(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Singleton);
    }

    if (args.length === 2) {
      if (isType(args[1])) {
        return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Singleton);
      }

      return this.addValue(args[0] as Type, args[1] as object);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Singleton
    );
  }

  addScoped(type: Type): this;
  addScoped<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addScoped<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
  addScoped(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Scoped);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Scoped);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Scoped
    );
  }

  addPrototype(type: Type): this;
  addPrototype<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addPrototype<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
  addPrototype(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Prototype);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Prototype);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Prototype
    );
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._descriptors[Symbol.iterator]();
  }
}

