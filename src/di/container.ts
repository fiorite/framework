import { ServiceType } from './type';
import { CallbackShare, ValueCallback } from '../core';
import { ServiceDescriptor } from './descriptor';
import type { ServiceProvideCallback } from './provider';

export class ServiceContainer implements Iterable<[ServiceType, unknown]> {
  private readonly _data = new Map<ServiceType, unknown>();
  private readonly _share = new CallbackShare();

  constructor(private readonly _provide: ServiceProvideCallback) {
  }

  has(type: ServiceType): boolean {
    return this._data.has(type);
  }

  request<T>(service: ServiceDescriptor<T>, done: ValueCallback<T>): void {
    if (this._data.has(service.type)) {
      return done(this._data.get(service.type) as T);
    }

    this._share(ServiceType.toString(service.type), callback => {
      service.prototype(this._provide, value => {
        this._data.set(service.type, value);
        callback(value);
      });
    }, done);
  }

  [Symbol.iterator](): Iterator<[ServiceType, unknown]> {
    return this._data[Symbol.iterator]();
  }
}
