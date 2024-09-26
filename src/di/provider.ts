import { CustomSet, FunctionClass, ValueCallback } from '../core';
import { ServiceType } from './type';
import { ServiceDescriptor } from './descriptor';
import { ServiceBehavior } from './behavior';
import { ServiceScope } from './scope';
import { remapBehaviourInheritance, validateBehaviourDependency, validateCircularDependency } from './_procedure';
import { ServiceFactoryFunction, ServiceProvideFunction } from './function';
import { InstantServiceProvideFunction, InstantServiceProvider } from './instant';

export interface ServiceProvider extends InstantServiceProvideFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */

  <T>(type: ServiceType<T>): T;

  /**
   * Fallback to {@link ServiceProvideFunction}
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

export class ServiceProvider extends FunctionClass<InstantServiceProvideFunction> implements Iterable<ServiceDescriptor> {
  static readonly symbol = Symbol('ServiceProvider');

  private readonly _set = new CustomSet<ServiceDescriptor, ServiceType>(x => x.type);

  private _scope?: ServiceScope;

  get scoped(): boolean {
    return !!this._scope;
  }

  private _createdFrom?: ServiceProvider;

  private readonly _instant: InstantServiceProvider;

  get instant(): InstantServiceProvider {
    return this._instant;
  }

  get provide(): InstantServiceProvideFunction {
    return this._instant;
  }

  constructor(descriptors: Iterable<ServiceDescriptor>, createdFrom?: ServiceProvider) {
    const instantProvider = new InstantServiceProvider((type, callback) => this._provide(type, callback));
    super(instantProvider);
    this._instant = instantProvider;
    const array = [
      ServiceDescriptor.value(ServiceProvider, this),
      ...descriptors,
    ];
    if (!createdFrom) { // todo: refactor in the future
      const array2 = remapBehaviourInheritance(array);
      array2.forEach(value => this._set.add(value));
      validateCircularDependency(array2);
      validateBehaviourDependency(array2);
    } else {
      array.forEach(value => this._set.add(value));
      this._createdFrom = createdFrom;
    }
  }

  /**
   * Raw implementation or {@link ServiceProvideFunction}.
   */
  private _provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const descriptor = this._set[CustomSet.data].get(type) as ServiceDescriptor<T> | undefined;

    if (undefined === descriptor) {
      throw new ServiceNotFoundError(type);
    }

    if (ServiceBehavior.Scoped === descriptor.behavior) {
      if (!this._scope) {
        throw new Error('Scope is not defined. Use #createScope()');
      }

      return this._scope.provide(type, callback, callback2 => {
        descriptor.factory(this._provide.bind(this), callback2);
      });
    }

    return descriptor.factory(this._provide.bind(this), callback);
  }

  provideAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.all(array)(this._provide.bind(this), callback);
  }

  has(type: ServiceType): boolean {
    return this._set[CustomSet.data].has(type);
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

    const scopeProvider = new ServiceProvider(this._set, this);
    scopeProvider._scope = new ServiceScope();
    configure(scopeProvider._instant);
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
    return this._set[Symbol.iterator]();
  }
}
