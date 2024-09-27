import { CustomSet, FunctionClass, MapCallback, ValueCallback, VoidCallback } from '../core';
import { ServiceType } from './type';
import { ServiceDescriptor } from './descriptor';
import { ServiceBehavior } from './behavior';
import { ServiceScope } from './scope';
import { remapBehaviorInheritance, validateBehaviorDependency, validateCircularDependency } from './_procedure';
import { ServiceFactoryFunction, ServiceProvideFunction } from './function';
import { InstantServiceProvideFunction, InstantServiceProvider } from './instant';
import { ServiceCallbackQueue } from './_queue';

export interface ServiceProvider extends InstantServiceProvideFunction {
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

export class ServiceProvider extends FunctionClass<InstantServiceProvideFunction> implements Iterable<ServiceDescriptor> {
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

        return provider._callbackShare.add([descriptor.type], resolve => {
          descriptor.factory(provide, resolve);
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

        return provider._serviceScope.provide(descriptor.type, callback, resolve => {
          descriptor.factory(provide, resolve);
        });
      };
    },
    [ServiceBehavior.Prototype]: ([_, descriptor]): ServiceFactoryFunction => {
      return descriptor.factory;
    },
  };

  private readonly _descriptors = new CustomSet<ServiceDescriptor, ServiceType>(x => x.type);

  private readonly _singletons: Map<ServiceType, unknown>;

  private readonly _callbackShare: ServiceCallbackQueue;

  private _serviceScope?: ServiceScope;

  get hasScope(): boolean {
    return !!this._serviceScope;
  }

  private _sourcedFrom?: ServiceProvider;

  private readonly _instantProvider: InstantServiceProvider;

  get instantProvider(): InstantServiceProvider {
    return this._instantProvider;
  }

  get provide(): InstantServiceProvideFunction {
    return this._instantProvider;
  }

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunction<unknown>>;

  constructor(descriptors: Iterable<ServiceDescriptor>, serviceScope?: ServiceScope) {
    const instantProvider = new InstantServiceProvider((type, callback) => this._provide(type, callback));
    super(instantProvider);
    this._serviceScope = serviceScope;
    this._instantProvider = instantProvider;
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
      this._callbackShare = new ServiceCallbackQueue();
    } else {
      descriptors._descriptors.forEach(addDescriptor);
      this._sourcedFrom = descriptors;
      this._singletons = descriptors._singletons;
      this._callbackShare = descriptors._callbackShare;
    }
  }

  /**
   * Raw implementation or {@link ServiceProvideFunction}.
   * @private
   */
  private _provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const behaviorFactory = this._runtimeMap.get(type) as ServiceFactoryFunction<T> | undefined;

    if (undefined === behaviorFactory) {
      throw new ServiceNotFoundError(type);
    }

    return behaviorFactory(this._provide.bind(this), callback);
  }

  provideAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.all(array)(this._provide.bind(this), callback);
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

  // catchAllLate(callback: VoidCallback): void {
  //   const descriptors = Array.from(this._descriptors.values()).filter(descriptor => descriptor.lateType);
  //
  //   descriptors.map(descriptor => {
  //     descriptor.factory(this._provide.bind(this), (description2, value) => {
  //
  //     });
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

  createScope(configure: (provide: InstantServiceProvideFunction) => void = () => void 0): ServiceProvider {
    if (this._serviceScope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this, new ServiceScope());
    configure(scopeProvider._instantProvider);
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
