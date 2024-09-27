import { CustomSet, FunctionClass, MapCallback, ValueCallback } from '../core';
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
        if (!provider._scope) {
          throw new Error('Scope is not defined. Use #createScope()');
        }

        return provider._scope.provide(descriptor.type, callback, resolve => {
          descriptor.factory(provide, resolve);
        });
      };
    },
    [ServiceBehavior.Prototype]: ([_, descriptor]): ServiceFactoryFunction => {
      return descriptor.factory;
    },
  };

  private readonly _descriptors = new CustomSet<ServiceDescriptor, ServiceType>(x => x.type);

  private readonly _singletons = new Map<ServiceType, unknown>();

  private _scope?: ServiceScope;

  get scoped(): boolean {
    return !!this._scope;
  }

  private _sourcedFrom?: ServiceProvider;

  private readonly _instantProvider: InstantServiceProvider;

  private readonly _callbackShare = new ServiceCallbackQueue();

  get instantProvider(): InstantServiceProvider {
    return this._instantProvider;
  }

  get provide(): InstantServiceProvideFunction {
    return this._instantProvider;
  }

  private _runtimeMap = new Map<ServiceType, ServiceFactoryFunction<unknown>>;

  constructor(descriptors: Iterable<ServiceDescriptor>, checkRules = true) {
    const instantProvider = new InstantServiceProvider((type, callback) => this._provide(type, callback));
    super(instantProvider);
    this._instantProvider = instantProvider;
    this._runtimeMap.set(ServiceProvider, (_, callback) => callback(this));

    const addDescriptor = (descriptor: ServiceDescriptor) => {
      this._descriptors.add(descriptor);
      this._runtimeMap.set(descriptor.type, ServiceProvider._behaviorFactories[descriptor.behavior]([this, descriptor]));
    };

    if (!(descriptors instanceof ServiceProvider)) { // todo: maybe refactor
      const array = remapBehaviorInheritance(descriptors);
      array.forEach(addDescriptor);
      array.unshift(ServiceDescriptor.value(ServiceProvider, this));
      validateCircularDependency(array);
      validateBehaviorDependency(array);
    } else {
      descriptors._descriptors.forEach(addDescriptor);
      this._sourcedFrom = descriptors;
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

  // prepareTypeFactory<T>(type: Type<T>): ServiceFactoryFunction<T> {
  //   if (this.has(type)) {
  //     return (provide, callback) => provide(type, callback);
  //   }
  //
  //   return _ServiceClassResolver.from(type);
  // }
  //
  // instantiateType<T>(type: Type<T>, callback: ValueCallback<T>): void {
  //   return this.prepareTypeFactory(type)(this._provide.bind(this), callback);
  // }
  //
  // validateDependencies<T extends object, K extends keyof T>(type: Type<T>, propertyKey: K): void {
  //   const methodResolver = _ServiceMethodResolver.from(type, propertyKey as string | symbol);
  //   methodResolver.dependencies.forEach((dep, index) => { // validate dependencies
  //     if (!this.has(dep)) {
  //       throw new Error(`Unknown param source at ${type.name}#${String(propertyKey)}(...[${index}]: ${ServiceType.toString(dep)})`);
  //     }
  //   });
  // }
  //
  // prepareMethodFactory<T extends object, K extends keyof T>(
  //   type: Type<T>,
  //   propertyKey: K
  // ): ServiceMethodResolveFunction<T, T[K] extends AnyCallback ? ReturnType<T[K]> : never> {
  //   return _ServiceMethodResolver.from(type, propertyKey as string | symbol);
  // }
  //
  // callObjectMethod<T extends object, K extends keyof T>(
  //   object: T,
  //   propertyKey: K,
  //   callback: ValueCallback<T[K] extends AnyCallback ? ReturnType<T[K]> : never>
  // ): void {
  //   this.prepareMethodFactory(object.constructor as Type, propertyKey)(object, this._provide.bind(this), callback as any);
  // }

  createScope(configure: (provide: InstantServiceProvideFunction) => void = () => void 0): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this);
    scopeProvider._scope = new ServiceScope();
    configure(scopeProvider._instantProvider);
    return scopeProvider;
  }

  destroyScope(): void {
    if (!this._scope) {
      throw new Error('No defined scope');
    }

    this._scope.destroy();
    delete this._scope;
  }

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this._descriptors[Symbol.iterator]();
  }
}
