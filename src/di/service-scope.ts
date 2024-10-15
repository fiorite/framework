import { ServiceType } from './service-type';
import { CallbackShare, ValueCallback } from '../core';

export class ServiceScope implements Iterable<[ServiceType, unknown]> {
  private readonly _scoped = new Map<ServiceType, unknown>();
  private readonly _callbackShare = new CallbackShare();

  through<T>(type: ServiceType<T>, result: (callback: ValueCallback<T>) => void, done: ValueCallback<T>): void {
    if (this._scoped.has(type)) {
      return done(this._scoped.get(type) as T);
    }

    this._callbackShare(ServiceType.toString(type), callback => {
      result(instance => {
        this._scoped.set(type, instance);
        callback(instance);
      });
    }, done);
  }

  [Symbol.iterator](): Iterator<[ServiceType, unknown]> {
    return this._scoped[Symbol.iterator]();
  }
}
