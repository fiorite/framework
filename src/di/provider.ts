import { AnyCallback, FunctionClass, Type, ValueCallback } from '../core';
import { ServiceType } from './type';
import { ServiceDeclaration } from './declaration';
import { ServiceBehaviour } from './behaviour';
import { ServiceScope } from './scope';
import { remapBehaviourInheritance, validateBehaviourDependency, validateCircularDependency } from './_procedure';
import { MaybeSyncProvideFunction, ServiceFactoryFunction, ServiceProvideFunction } from './function-type';
import { _ServiceClassResolver, _ServiceMethodResolver, ServiceMethodResolveFunction } from './_resolver';
import { MaybeSyncServiceProvider } from './maybe-sync';

export interface ServiceProvider extends MaybeSyncProvideFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */
  <T>(type: ServiceType<T>): T;

  /**
   * Fallback to {@link ServiceProvideFunction}
   */
  <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class ServiceProvider extends FunctionClass<MaybeSyncProvideFunction> implements Iterable<ServiceDeclaration> {
  static readonly symbol = Symbol('ServiceProvider');

  private readonly _data: readonly ServiceDeclaration[];

  private _scope?: ServiceScope;

  get scopeDefined(): boolean {
    return !!this._scope;
  }

  private _createdFrom?: ServiceProvider;

  private readonly _maybeSyncProvider: MaybeSyncServiceProvider;

  get maybeSyncProvider(): MaybeSyncServiceProvider {
    return this._maybeSyncProvider;
  }

  constructor(data: readonly ServiceDeclaration[], createdFrom?: ServiceProvider) {
    const maybeSyncProvider = new MaybeSyncServiceProvider((type, callback) => this.provide(type, callback));
    super(maybeSyncProvider);
    this._maybeSyncProvider = maybeSyncProvider;
    if (!createdFrom) {
      this._data = [ServiceDeclaration.fromInstance({
        serviceInstance: this,
        serviceKey: ServiceProvider,
      }), ...remapBehaviourInheritance(data)];
      validateCircularDependency(this._data);
      validateBehaviourDependency(this._data);
    } else {
      this._data = [ServiceDeclaration.fromInstance({
        serviceInstance: this,
        serviceKey: ServiceProvider,
      }), ...data];
      this._createdFrom = createdFrom;
    }
  }

  /**
   * Raw implementation or {@link ServiceProvideFunction}.
   */
  provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void {
    const index = this._data.findIndex(def => def.serviceKey === type);

    if (index < 0) {
      throw new Error('Service is not found: ' + ServiceType.toString(type));
    }

    const service = this._data[index] as ServiceDeclaration<T>;

    if (ServiceBehaviour.Scoped === service.behaviour) {
      if (!this._scope) {
        throw new Error('Scope is not defined. Use #createScope()');
      }

      return this._scope.provide(type, callback, callback2 => {
        service.serviceFactory(this.provide.bind(this), callback2);
      });
    }

    return service.serviceFactory(this.provide.bind(this), callback);
  }

  provideAll(array: ServiceType[], callback: ValueCallback<unknown[]>): void {
    return ServiceFactoryFunction.from(array)(this.provide.bind(this), callback);
  }

  has(type: ServiceType): boolean {
    return this._data.findIndex(x => x.serviceKey === type) > -1;
  }

  prepareTypeFactory<T>(type: Type<T>): ServiceFactoryFunction<T> {
    if (this.has(type)) {
      return (provide, callback) => provide(type, callback);
    }

    return _ServiceClassResolver.from(type);
  }

  instantiateType<T>(type: Type<T>, callback: ValueCallback<T>): void {
    return this.prepareTypeFactory(type)(this.provide.bind(this), callback);
  }

  validateDependencies<T extends object, K extends keyof T>(type: Type<T>, propertyKey: K): void {
    const methodResolver = _ServiceMethodResolver.from(type, propertyKey as string | symbol);
    methodResolver.dependencies.forEach((dep, index) => { // validate dependencies
      if (!this.has(dep)) {
        throw new Error(`Unknown param source at ${type.name}#${String(propertyKey)}(...[${index}]: ${ServiceType.toString(dep)})`);
      }
    });
  }

  prepareMethodFactory<T extends object, K extends keyof T>(
    type: Type<T>,
    propertyKey: K
  ): ServiceMethodResolveFunction<T, T[K] extends AnyCallback ? ReturnType<T[K]> : never> {
    return _ServiceMethodResolver.from(type, propertyKey as string | symbol);
  }

  callObjectMethod<T extends object, K extends keyof T>(
    object: T,
    propertyKey: K,
    callback: ValueCallback<T[K] extends AnyCallback ? ReturnType<T[K]> : never>
  ): void {
    this.prepareMethodFactory(object.constructor as Type, propertyKey)(object, this.provide.bind(this), callback as any);
  }

  createScope(configure: (provide: MaybeSyncProvideFunction) => void = () => void 0): ServiceProvider {
    if (this._scope) {
      throw new Error('Sub-scope is not supported');
    }

    const scopeProvider = new ServiceProvider(this._data, this);
    scopeProvider._scope = new ServiceScope();
    configure(scopeProvider._maybeSyncProvider);
    return scopeProvider;
  }

  destroyScope(): void {
    if (!this._scope) {
      throw new Error('No defined scope');
    }

    this._scope.destroy();
    delete this._scope;
  }

  [Symbol.iterator](): Iterator<ServiceDeclaration> {
    return this._data[Symbol.iterator]();
  }
}
