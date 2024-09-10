import { FunctionClass, propertyNotFound, Type, ValueCallback } from '../core';
import { ServiceKey } from './key';
import { ServiceDeclaration } from './declaration';
import { ServiceBehaviour } from './behaviour';
import { ServiceNotFound } from './error';
import { ServiceScope } from './scope';
import { remapBehaviourInheritance, validateBehaviourDependency, validateCircularDependency } from './_procedure';
import { ServiceProvideFunction } from './function-type';
import { ServiceClassResolver, ServiceMethodResolver } from 'fiorite/service/_resolver';
import { AnyFunction } from 'fiorite/core/function';

export interface ServiceProvider {
  <T>(key: ServiceKey<T>, callback: ValueCallback<T>): void;
}

export class ServiceProvider extends FunctionClass<ServiceProvideFunction> {
  static readonly symbol = Symbol('ServiceProvider');

  private readonly _data: readonly ServiceDeclaration[];

  private _scope?: ServiceScope;

  static findIn(object: object): ServiceProvider {
    const descriptor = Object.getOwnPropertyDescriptor(object, ServiceProvider.symbol);

    if (!descriptor) {
      throw propertyNotFound(`ServiceProvider is not found in ${object.constructor.name}`);
    }

    return descriptor.value as ServiceProvider;
  }

  constructor(collection: readonly ServiceDeclaration[]) {
    super((key, callback) => this.provide(key, callback));
    this._data = remapBehaviourInheritance(collection);
    validateCircularDependency(this._data);
    validateBehaviourDependency(this._data);
  }

  provide<T>(serviceKey: ServiceKey<T>, callback: ValueCallback<T>): void {
    const index = this._data.findIndex(def => def.serviceKey === serviceKey);

    if (index < 0) {
      throw new ServiceNotFound(serviceKey);
    }

    const service = this._data[index] as ServiceDeclaration<T>;

    if (ServiceBehaviour.Scope === service.behaviour) {
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

  instantiateType<T>(type: Type<T>, callback: ValueCallback<T>): void {
    if (this.includes(type)) {
      return this.provide(type, callback);
    }

    const classResolver = ServiceClassResolver.useLightweight(type);
    classResolver(this, callback);
  }

  callObjectMethod<T extends object, K extends keyof T>(object: T, propertyKey: K, callback: ValueCallback<T[K] extends AnyFunction ? ReturnType<T[K]> : never>): void {
    const methodResolver = ServiceMethodResolver.useLightweight(object.constructor as Type, propertyKey as string | symbol);
    methodResolver(object, this, callback as any);
  }

  createScope(configure: (provide: ServiceProvideFunction) => void): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this._data);
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
}
