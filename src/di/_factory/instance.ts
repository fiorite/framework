import { FunctionClass } from '../../core';
import { ServiceFactoryFunction } from '../function';

export class ServiceInstanceFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _serviceInstance: T;

  get serviceInstance(): T {
    return this._serviceInstance;
  }

  constructor(serviceInstance: T) {
    super((_, callback) => callback(serviceInstance));
    this._serviceInstance = serviceInstance;
  }
}
