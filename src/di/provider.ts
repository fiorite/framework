import {
  AbstractType,
  CallbackForceValueError,
  DecoratorOuterFunction,
  DecoratorRecorder,
  emptyCallback,
  forceCallbackValue,
  FunctionClass,
  isObjectMethod,
  isType,
  MapCallback,
  MaybeOptional,
  MaybePromiseLike,
  OptionalMarker,
  Type,
  ValueCallback,
  VoidCallback
} from '../core';
import { ServiceType } from './type';
import { ServiceBehavior } from './behavior';
import { ServiceFactoryCallback, ServiceFactoryFunction } from './factory';
import { iterableForEach } from '../iterable';
import { BehaveLike } from './decorators';
import { Provide } from './provide';
import { ServiceDescriptor } from './descriptor';
import { ServiceContainer } from './container';

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
export interface ServiceProvideCallback {
  /**
   * @throws ServiceNotFoundError if unable to find a service.
   */
  <T>(type: ServiceType<T>, then: ValueCallback<T>): void;

  <T>(type: OptionalMarker<ServiceType<T>>, then: ValueCallback<T | undefined>): void;

  <T>(type: MaybeOptional<ServiceType<T>>, then: ValueCallback<typeof type extends OptionalMarker<unknown> ? T | undefined : T>): void;
}

/**
 * Provide with return is an attempt to catch a synchronous value out of provide callback.
 * Side effect is {@link NotSynchronousServiceError} throw when service is asynchronous.
 *
 * @throws Error when unable to catch a value, thus service considered to be asynchronous, unless one uses callback overload.
 */
export interface ServiceProvideFunction extends ServiceProvideCallback {
  <T>(type: ServiceType<T>): T;

  <T>(type: OptionalMarker<ServiceType<T>>): T | undefined;

  <T>(type: MaybeOptional<ServiceType<T>>): typeof type extends OptionalMarker<unknown> ? T | undefined : T;
}

export interface ServiceProvideAsyncFunction {
  <T>(type: ServiceType<T>): PromiseLike<T>;

  <T>(type: OptionalMarker<ServiceType<T>>): PromiseLike<T | undefined>;

  <T>(type: MaybeOptional<ServiceType<T>>): PromiseLike<typeof type extends OptionalMarker<unknown> ? T | undefined : T>;
}

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
          if (resolvedDescriptor.type === descriptor.type) { //
            descriptor = resolvedDescriptor;
          }
          provider._serviceMap.set(resolvedDescriptor.type, resolvedDescriptor);
        });

        descriptor = provider._serviceMap.get(descriptor.type)!;
        const factoryToSet = ServiceProvider._behaviorFactories[descriptor.behavior](descriptor);
        provider._runtimeMap.set(descriptor.type, factoryToSet);
        return factoryToSet(provider, callback);
      };
    },
    [ServiceBehavior.Singleton]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => provider._singletonContainer.request(descriptor, callback);
    },
    [ServiceBehavior.Scoped]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => {
        if (!provider.scopeContainer) {
          throw new Error('Scope is not defined. Use #createScope()');
        }

        return provider.scopeContainer.request(descriptor, callback);
      };
    },
    [ServiceBehavior.Prototype]: (descriptor): ServiceFactoryFunctionWithProvider => {
      return (provider, callback) => descriptor.prototype(provider._provide.bind(provider), callback);
    },
  };

  static createWithScope(from: ServiceProvider): ServiceProvider {
    if (from._scopeContainer) {
      throw new Error('ServiceProvider has Scope already.');
    }

    const scoped = new ServiceProvider(from);
    scoped._scopeContainer = new ServiceContainer(scoped._provide.bind(scoped));
    return scoped;
  }

  static destroyScope(of: ServiceProvider): void {
    if (!of._scopeContainer) {
      throw new Error('ServiceProvider has no Scope.');
    }

    const scope = of._scopeContainer;
    delete of._scopeContainer;

    iterableForEach<[ServiceType, unknown]>(entry => {
      if (isObjectMethod(entry[1], 'onScopeDestroy')) {
        entry[1]['onScopeDestroy']();
      }
    })(scope);
  }

  private readonly _serviceMap = new Map<ServiceType, ServiceDescriptor>();

  private readonly _singletonContainer: ServiceContainer;

  private _scopeContainer?: ServiceContainer;

  get scopeContainer(): ServiceContainer | undefined {
    return this._scopeContainer;
  }

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunctionWithProvider>;

  private _preCacheSingletons?: boolean;

  private _behavioralMap: Map<Type, ServiceBehavior> = new Map(
    DecoratorRecorder.classSearch(BehaveLike).map(d => [d.path[0] as Type, d.payload])
  );

  constructor(descriptors: Iterable<ServiceDescriptor> = []) {
    super((...args: unknown[]) => (this.get as Function)(...args));

    if (!(descriptors instanceof ServiceProvider)) { // todo: maybe refactor
      this._serviceMap = new Map<ServiceType, ServiceDescriptor>(
        Array.from(descriptors).map(descriptor => ([descriptor.type, descriptor]))
      );
      // this._serviceSet = new ServiceSet(descriptors, {
      //   add: descriptor => {
      //     this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
      //     if (this._preCacheSingletons && descriptor.singletonBehavior) {
      //       this._provide(descriptor.type, emptyCallback);
      //     }
      //   },
      //   delete: descriptor => {
      //     if (this._mentionedInDependencies(descriptor)) {
      //       throw new Error('Service is listed as a dependency. Unable to process descriptor deletion.');
      //     }
      //
      //     this._runtimeMap.delete(descriptor.type);
      //
      //     if ( // delete singleton instance
      //       descriptor.singletonBehavior && this._singletons.has(descriptor.type)
      //     ) {
      //       this._singletons.delete(descriptor.type);
      //     }
      //   },
      //   clear: () => this._runtimeMap.clear(),
      // });

      this._makeBehaviorInheritance().forEach(newDescriptor => this._serviceMap.set(newDescriptor.type, newDescriptor));
      this._serviceMap.forEach((descriptor: ServiceDescriptor) => {
        this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior](descriptor));
      });
      this._singletonContainer = new ServiceContainer(this._provide.bind(this));
    } else {
      this._serviceMap = descriptors._serviceMap;
      this._runtimeMap = descriptors._runtimeMap;
      this._singletonContainer = descriptors._singletonContainer;
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
  private _provide<T>(type: MaybeOptional<ServiceType<T>>, callback: ValueCallback<T>): void {
    const [type2, optional] = MaybeOptional.spread(type);
    const behaviorFactory = this._runtimeMap.get(type2) as ServiceFactoryFunctionWithProvider<T> | undefined;

    if (undefined === behaviorFactory) {
      if (optional) {
        return callback(undefined as T);
      }
      throw new ServiceNotFoundError(type2);
    }

    return behaviorFactory(this, callback);
  }

  get<T>(type: MaybeOptional<ServiceType<T>>): T;
  get<T>(type: MaybeOptional<ServiceType<T>>, then: ValueCallback<T>): void;
  get(type: MaybeOptional<ServiceType>, callback?: ValueCallback<unknown>): unknown {
    if (callback) {
      return this._provide(type, callback);
    }

    try {
      return forceCallbackValue(complete => this._provide(type, complete));
    } catch (error) {
      if (error instanceof CallbackForceValueError) {
        const [type2] = MaybeOptional.spread(type);
        throw new NotSynchronousServiceError(type2);
      }
      throw error;
    }
  }

  getAll(array: readonly MaybeOptional<ServiceType>[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryCallback.all(array)(this._provide.bind(this), callback);
  }

  async<T>(type: MaybeOptional<ServiceType<T>>): PromiseLike<T> {
    return new Promise((resolve, reject) => {
      try {
        this._provide(type, resolve);
      } catch (err) {
        reject(err);
      }
    });
  }

  asyncAll(array: MaybeOptional<ServiceType>[]): PromiseLike<unknown[]> {
    return Promise.all(
      array.map(type => this.async(type))
    );
  }

  // todo: add set which will forcefully set the service unless there no dependency done on it.
  // think of rebuilding stuff, will likely not work.

  has(type: ServiceType): boolean {
    return this._serviceMap.has(type);
  }

  // region procedures

  private _dependenciesToDescriptors(descriptor: ServiceDescriptor): ServiceDescriptor[] {
    return descriptor.dependencies.filter(x => x !== ServiceProvider).reduce((result, dependency) => {
      const [type, optional] = MaybeOptional.spread(dependency);
      const x = this._serviceMap.get(type);
      if (!x) {
        if (!optional) {
          throw new Error('Missing dependency: ' + ServiceType.toString(type));
        }
      } else {
        result.push(x);
      }

      return result;
    }, [] as ServiceDescriptor[]);
  }

  private _makeBehaviorInheritance(...descriptors: ServiceDescriptor[]): ServiceDescriptor[] {
    const result: ServiceDescriptor[] = [];
    const queue: ServiceDescriptor[] = [];

    if (descriptors.length) {
      if (descriptors.some(x => !x.inheritedBehavior)) {
        throw new Error('requested service is not inherited');
      }
      queue.push(...descriptors);
    } else {
      this._serviceMap.forEach(descriptor => {
        if (descriptor.inheritedBehavior) {
          queue.push(descriptor);
        }
      });
    }

    while (queue.length) {
      const descriptor1 = queue.shift()!;
      const dependencies = descriptor1.dependencies.reduce((descriptors, dependency) => {
        const [type, optional] = MaybeOptional.spread(dependency);
        const index = result.findIndex(x => x.type === type);
        if (index > -1) {
          descriptors.push(result[index]);
        } else {
          const x = this._serviceMap.get(type);
          if (!x) {
            if (!optional) {
              throw new Error('Missing dependency: ' + ServiceType.toString(type));
            }
          } else {
            descriptors.push(x);
          }
        }
        return descriptors;
      }, [] as ServiceDescriptor[]);

      const inheritedDeps = dependencies.filter(x => x.inheritedBehavior);
      if (inheritedDeps.length) {
        inheritedDeps.forEach(inheritedDescriptor => { // clean queue
          const index = queue.findIndex(x => x.type === inheritedDescriptor.type);
          queue.splice(index, 1);
        });

        // put dependencies first and current descriptor in the end.
        queue.unshift(...inheritedDeps, descriptor1);
      } else {
        const behaviorToInherit = dependencies.some(dependency => dependency.scopedBehavior) ?
          ServiceBehavior.Scoped : ServiceBehavior.Singleton;
        result.push(descriptor1.withBehavior(behaviorToInherit));
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

      if (declaration.singletonBehavior) {
        const index2 = dependencies.findIndex(x => x.scopedBehavior);
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

  // private _mentionedInDependencies(dependency: ServiceDescriptor2): boolean {
  //   for (const descriptor of this._serviceMap.values()) {
  //     if (descriptor.dependencies.includes(dependency.type)) { todo: add inner check
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  // endregion

  preCacheSingletons(callback: VoidCallback): void {
    this._preCacheSingletons = true;

    const descriptors: ServiceDescriptor[] = [];
    this._serviceMap.forEach(descriptor => {
      if (descriptor.singletonBehavior && !this._singletonContainer.has(descriptor.type)) {
        descriptors.push(descriptor);
      }
    });

    this.getAll(descriptors.map(x => x.type), () => callback());
  }

  // region add a new service

  //  todo: fix
  add(object: object): this;
  add<T>(serviceType: ServiceType<T>, object: T): this;
  add(type: Type): this;
  add<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): this;
  add<T>(type: Type<T>, dependencies: ServiceType[], behavior?: ServiceBehavior): this;
  add(...args: unknown[]): this {
    if (args.length === 1) {
      if (isType(args[0])) {
        return this.addType(args[0] as Type);
      }

      return this.addValue(args[0] as object);
    }

    if (args.length > 1 && (isType(args[1]) || Array.isArray(args[1]))) {
      return this.addType(args[0] as ServiceType, args[1] as Type, args[2] as ServiceBehavior);
    }

    return this.addValue(args[0] as Type, args[1] as object);
  }

  addDecoratedBy(...decorators: DecoratorOuterFunction<ClassDecorator>[]): this {
    decorators.flatMap(decorator => DecoratorRecorder.classSearch(decorator).map(x => x.path[0]))
      .filter(type => !this._serviceMap.has(type))
      .forEach(type => this.addType(type as Type));
    return this;
  }

  addMissingDependencies(): this {
    const queue = Array.from(this);
    while (queue.length) {
      const descriptor = queue.shift()!;
      descriptor.dependencies
        .filter(dependency => {
          const [dependencyType, optional] = MaybeOptional.spread(dependency);
          return !this._serviceMap.has(dependencyType) && !optional && dependency !== ServiceProvider; // ignore optional type
        })
        .filter(isType)
        .map(type => this._addType(type))
        .forEach(descriptor2 => queue.push(descriptor2));
    }
    return this;
  }

  private _add(service: ServiceDescriptor): this {
    this._serviceMap.set(service.type, service);
    this._runtimeMap.set(service.type, ServiceProvider._behaviorFactories[service.behavior](service));
    if (this._preCacheSingletons && service.singletonBehavior) {
      this._provide(service.type, emptyCallback);
    }
    return this;
  }

  // todo: copy all overloads from ServiceDescriptor
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
    this._add(descriptor);
    return descriptor;
  }

  addFactory<T>(type: ServiceType<T>, prototypeFunction: () => MaybePromiseLike<T>, behavior?: ServiceBehavior): this;
  addFactory<T>(type: ServiceType<T>, dependencies: MaybeOptional<ServiceType>[], prototypeFunction: (...args: any[]) => MaybePromiseLike<T>, behavior?: ServiceBehavior): this;
  addFactory(...args: unknown[]): this {
    const descriptor = (ServiceDescriptor.fromFactory as Function)(...args);
    return this._add(descriptor);
  }

  addValue(object: object): this;
  addValue<T>(serviceType: ServiceType<T>, object: T): this;
  addValue(...args: unknown[]): this {
    return this._add(
      args.length === 1 ? ServiceDescriptor.fromValue(args[0] as object) :
        ServiceDescriptor.fromValue(args[0] as ServiceType<object>, args[1] as object)
    );
  }

  addInherited(type: Type): this;
  addInherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, factory: ServiceFactoryFunction<T>, dependencies?: ServiceType[]): this;
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
      Array.isArray(args[2]) ? args[2] : [],
      args[1] as ServiceFactoryFunction<unknown>,
      ServiceBehavior.Inherited
    );
  }

  addSingleton(type: Type): this;
  addSingleton<T>(type: ServiceType<T>, value: T): this;
  addSingleton<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addSingleton<T>(type: ServiceType<T>, callback: ServiceFactoryFunction<T>, dependencies?: ServiceType[]): this;
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
      Array.isArray(args[2]) ? args[2] : [],
      args[1] as ServiceFactoryFunction<unknown>,
      ServiceBehavior.Singleton
    );
  }

  addScoped(type: Type): this;
  addScoped<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addScoped<T>(type: ServiceType<T>, callback: ServiceFactoryFunction<T>, dependencies?: ServiceType[]): this;
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
      Array.isArray(args[2]) ? args[2] : [],
      args[1] as ServiceFactoryFunction<unknown>,
      ServiceBehavior.Scoped
    );
  }

  addPrototype(type: Type): this;
  addPrototype<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addPrototype<T>(type: ServiceType<T>, callback: ServiceFactoryFunction<T>, dependencies?: ServiceType[]): this;
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
      Array.isArray(args[2]) ? args[2] : [],
      args[1] as ServiceFactoryFunction<unknown>,
      ServiceBehavior.Prototype
    );
  }

  prototypeWhenMissing<T>(type: Type<T>, done: ValueCallback<T>): void {
    if (this.has(type)) {
      return this.get(type, done);
    }

    const target = Provide.targetAssemble(type);
    this.getAll(target.dependencies, args => done(new type(...args)));
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._serviceMap.values();
  }
}

