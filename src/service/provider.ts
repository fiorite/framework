import { FunctionClass, propertyNotFound, ValueCallback } from '../core';
import { ServiceKey } from './key';
import { ServiceDeclaration } from './declaration';
import { ServiceBehaviour } from './behaviour';
import { ServiceNotFound } from './error';
import { ServiceScope } from './scope';
import { remapBehaviourInheritance, validateBehaviourDependency, validateCircularDependency } from './_procedure';
import { ServiceProvideFunction } from './function-type';

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

      return this._scope.provide(serviceKey, callback, callback2 => service.serviceFactory(this as ServiceProvideFunction, callback2));
    }

    return service.serviceFactory(this as ServiceProvideFunction, callback);
  }

  includes(serviceKey: ServiceKey): boolean {
    return this._data.findIndex(x => x.serviceKey === serviceKey) > -1;
  }

  bindSelfTo(object: object): void {
    Object.defineProperty(object, ServiceProvider.symbol, {value: this});
  }

  createScope(configure: (provide: ServiceProvideFunction) => void): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this._data);
    scopeProvider._scope = new ServiceScope();
    configure(scopeProvider as ServiceProvideFunction);
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
