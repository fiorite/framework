import { ServiceType } from './service-type';
import { CallbackShare, ReadonlyMapView, ValueCallback } from '../core';

export class ServiceScope extends ReadonlyMapView<ServiceType, unknown> {
  readonly #scoped: Map<ServiceType, unknown>;
  readonly #callbackShare = new CallbackShare();

  constructor() {
    const scoped = new Map<ServiceType, unknown>();
    super(scoped);
    this.#scoped = scoped;
  }

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
}
