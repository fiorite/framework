import { ServiceType } from './service-type';
import { CallbackShare, ValueCallback } from '../core';

export class ServiceScope implements Iterable<[ServiceType, unknown]> {
  readonly #scoped = new Map<ServiceType, unknown>();
  readonly #callbackShare = new CallbackShare();

  through<T>(type: ServiceType<T>, complete: (callback: ValueCallback<T>) => void, then: ValueCallback<T>): void {
    if (this.#scoped.has(type)) {
      return then(this.#scoped.get(type) as T);
    }

    this.#callbackShare(ServiceType.toString(type), callback => {
      complete(instance => {
        this.#scoped.set(type, instance);
        callback(instance);
      });
    }, then);
  }

  [Symbol.iterator](): Iterator<[ServiceType, unknown]> {
    return this.#scoped[Symbol.iterator]();
  }
}
