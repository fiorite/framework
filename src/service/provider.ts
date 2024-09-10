import { FunctionClass, propertyNotFound, Type, ValueCallback } from '../core';
import { ServiceKey } from './key';
import { ServiceDeclaration } from './declaration';
import { ServiceBehaviour } from './behaviour';
import { ServiceNotFound } from './error';
import { ServiceScope } from './scope';
import { remapBehaviourInheritance, validateBehaviourDependency, validateCircularDependency } from './_procedure';
import { ServiceFactoryFunction, ServiceProvideFunction } from './function-type';
import { ServiceClassResolver, ServiceMethodResolveFunction, ServiceMethodResolver } from 'fiorite/service/_resolver';
import { AnyFunction } from 'fiorite/core/function';

export interface ServiceProvider {
  <T>(key: ServiceKey<T>, callback: ValueCallback<T>): void;
}

export class ServiceProvider extends FunctionClass<ServiceProvideFunction> implements Iterable<ServiceDeclaration> {
  static readonly symbol = Symbol('ServiceProvider');

  private readonly _data: readonly ServiceDeclaration[];

  private _scope?: ServiceScope;

  private _createdFrom?: ServiceProvider;

  static findIn(object: object): ServiceProvider {
    const descriptor = Object.getOwnPropertyDescriptor(object, ServiceProvider.symbol);

    if (!descriptor) {
      throw propertyNotFound(`ServiceProvider is not found in ${object.constructor.name}`);
    }

    return descriptor.value as ServiceProvider;
  }

  constructor(data: readonly ServiceDeclaration[], createdFrom?: ServiceProvider) {
    super((key, callback) => this.provide(key, callback));
    if (!createdFrom) {
      this._data = remapBehaviourInheritance(data);
      validateCircularDependency(this._data);
      validateBehaviourDependency(this._data);
    } else {
      this._data = data;
      this._createdFrom = createdFrom;
    }
  }

  provide<T>(serviceKey: ServiceKey<T>, callback: ValueCallback<T>): void {
    const index = this._data.findIndex(def => def.serviceKey === serviceKey);

    if (index < 0) {
      throw new ServiceNotFound(serviceKey);
    }

    const service = this._data[index] as ServiceDeclaration<T>;

    if (ServiceBehaviour.Scoped === service.behaviour) {
      if (!this._scope) {
        throw new Error('Scope is not defined. Use #createScope()');
      }

      return this._scope.provide(serviceKey, callback, callback2 => service.serviceFactory(this, callback2));
    }

    return service.serviceFactory(this, callback);
  }

  includes(serviceKey: ServiceKey): boolean {
    return this._data.findIndex(x => x.serviceKey === serviceKey) > -1;
  }

  bindSelfTo(object: object): void {
    Object.defineProperty(object, ServiceProvider.symbol, {value: this});
  }

  prepareTypeFactory<T>(type: Type<T>): ServiceFactoryFunction<T> {
    if (this.includes(type)) {
      return (provide, callback) => provide(type, callback);
    }

    return ServiceClassResolver.useLightweight(type);
  }

  instantiateType<T>(type: Type<T>, callback: ValueCallback<T>): void {
    return this.prepareTypeFactory(type)(this, callback);
  }

  validateDependencies<T extends object, K extends keyof T>(type: Type<T>, propertyKey: K): void {
    const methodResolver = ServiceMethodResolver.useLightweight(type, propertyKey as string | symbol);
    methodResolver.dependencies.forEach((dep, index) => { // validate dependencies
      if (!this.includes(dep)) {
        throw new Error(`Unknown param source at ${type.name}#${String(propertyKey)}(...[${index}]: ${ServiceKey.toString(dep)})`);
      }
    });
  }

  prepareMethodFactory<T extends object, K extends keyof T>(
    type: Type<T>,
    propertyKey: K
  ): ServiceMethodResolveFunction<T, T[K] extends AnyFunction ? ReturnType<T[K]> : never> {
    return ServiceMethodResolver.useLightweight(type, propertyKey as string | symbol);
  }

  callObjectMethod<T extends object, K extends keyof T>(
    object: T,
    propertyKey: K,
    callback: ValueCallback<T[K] extends AnyFunction ? ReturnType<T[K]> : never>
  ): void {
    this.prepareMethodFactory(object.constructor as Type, propertyKey)(object, this, callback as any);
  }

  createScope(configure: (provide: ServiceProvideFunction) => void = () => void 0): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this._data, this);
    scopeProvider._scope = new ServiceScope();
    configure(scopeProvider);
    return scopeProvider;
  }

  destroyScope(): void {
    if (!this._scope) {
      throw new Error('No defined scope');
    }

    this._scope.destroyScope();
    delete this._scope;
  }

  [Symbol.iterator](): Iterator<ServiceDeclaration> {
    return this._data[Symbol.iterator]();
  }
}
