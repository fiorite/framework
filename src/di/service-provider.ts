import { CallbackShare, CustomSet, FunctionClass, MapCallback, ValueCallback, VoidCallback } from '../core';
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
   */
  <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

/**
 * Provide with return is an attempt to catch a synchronous value out of provide callback.
 * Side effect is {@link Error} throw when service is asynchronous.
 */
export interface ServiceProviderWithReturnFunction extends ServiceProvideFunction {
  /**
   * @throws Error when unable to catch a value, thus service considered to be asynchronous.
   */
  <T>(type: ServiceType<T>): T;
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
   * Raw implementation of {@link ServiceProvideFunction}.
   * @private
   */
  private readonly _provide: ServiceProvideFunction;

  get provide(): ServiceProvideFunction {
    return this._provide;
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
    this._provide = provide;
  }
}

export interface ServiceProvider extends ServiceProviderWithReturnFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */<T>(type: ServiceType<T>): T;

  /**
   * Fallback to {@link ServiceProvideFunction}
   */<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class ServiceNotFoundError implements Error {
  readonly name = 'ServiceNotFound';
  readonly message: string;

  constructor(readonly type: ServiceType) {
    this.message = 'service is not found: ' + ServiceType.toString(type);
  }
}

export class ServiceProvider extends FunctionClass<ServiceProviderWithReturnFunction> implements Iterable<ServiceDescriptor> {
  private static _behaviorFactories: Record<ServiceBehavior, MapCallback<[ServiceProvider, ServiceDescriptor], ServiceFactoryFunction>> = {
    [ServiceBehavior.Inherited]: () => {
      return (_, descriptor): never => {
        throw new Error('inherited service is not re-mapped: ' + descriptor.toString());
      };
    },
    [ServiceBehavior.Singleton]: ([provider, descriptor]): ServiceFactoryFunction => {
      return (provide, callback) => {
        if (provider._singletons.has(descriptor.type)) {
          return callback(provider._singletons.get(descriptor.type));
        }

        return provider._callbackShare(ServiceType.toString(descriptor.type), fulfill => {
          descriptor.factory(provide, fulfill);
        }, value => {
          provider._singletons.set(descriptor.type, value);
          callback(value);
        });
      };
    },
    [ServiceBehavior.Scoped]: ([provider, descriptor]): ServiceFactoryFunction => {
      return (provide, callback) => {
        if (!provider._serviceScope) {
          throw new Error('Scope is not defined. Use #createScope()');
        }

        return provider._serviceScope.get(descriptor.type, resolve => descriptor.factory(provide, resolve), callback);
      };
    },
    [ServiceBehavior.Prototype]: ([_, descriptor]): ServiceFactoryFunction => {
      return descriptor.factory;
    },
  };

  private readonly _descriptors = new CustomSet<ServiceDescriptor, ServiceType>(x => x.type);

  private readonly _singletons: Map<ServiceType, unknown>;

  private readonly _callbackShare: CallbackShare;

  private _serviceScope?: ServiceScope;

  get hasScope(): boolean {
    return !!this._serviceScope;
  }

  private _sourcedFrom?: ServiceProvider;

  private readonly _withReturn: ServiceProviderWithReturn;

  get withReturn(): ServiceProviderWithReturn {
    return this._withReturn;
  }

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunction<unknown>>;

  constructor(descriptors: Iterable<ServiceDescriptor>, serviceScope?: ServiceScope) {
    const withReturn = new ServiceProviderWithReturn((type, callback) => this.provide(type, callback));
    super(withReturn);
    this._serviceScope = serviceScope;
    this._withReturn = withReturn;
    this._runtimeMap.set(ServiceProvider, (_, callback) => callback(this));

    const addDescriptor = (descriptor: ServiceDescriptor) => {
      this._descriptors.add(descriptor);
      this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior]([this, descriptor]));
    };

    if (!(descriptors instanceof ServiceProvider)) { // todo: maybe refactor
      const array = remapBehaviorInheritance(descriptors);
      array.forEach(addDescriptor);
      array.unshift(ServiceDescriptor.fromValue(ServiceProvider, this));
      validateCircularDependency(array);
      validateBehaviorDependency(array);
      this._singletons = new Map();
      this._callbackShare = new CallbackShare();
    } else {
      descriptors._descriptors.forEach(addDescriptor);
      this._sourcedFrom = descriptors;
      this._singletons = descriptors._singletons;
      this._callbackShare = descriptors._callbackShare;
    }
  }

  /**
   * Raw implementation or {@link ServiceProvideFunction}.
   */
  provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const behaviorFactory = this._runtimeMap.get(type) as ServiceFactoryFunction<T> | undefined;

    if (undefined === behaviorFactory) {
      throw new ServiceNotFoundError(type);
    }

    return behaviorFactory(this.provide.bind(this), callback);
  }

  provideAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.all(array)(this.provide.bind(this), callback);
  }

  has(type: ServiceType): boolean {
    return this._descriptors[CustomSet.data].has(type);
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
    this._descriptors.forEach(descriptor => {
      if (ServiceBehavior.Singleton === descriptor.behavior && !this._singletons.has(descriptor.type)) {
        descriptors.push(descriptor);
      }
    });

    this.provideAll(descriptors.map(x => x.type), () => callback());
  }

  createScope(configure: (provide: ServiceProviderWithReturnFunction) => void = () => void 0): ServiceProvider {
    if (this._serviceScope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this, new ServiceScope());
    configure(scopeProvider._withReturn);
    return scopeProvider;
  }

  destroyScope(): void {
    if (!this._serviceScope) {
      throw new Error('No defined scope');
    }

    this._serviceScope.destroy();
    delete this._serviceScope;
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._descriptors[Symbol.iterator]();
  }
}
