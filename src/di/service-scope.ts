import { ServiceType } from './service-type';
import { CallbackShare, ReadonlyMapView, ValueCallback } from '../core';

export class ServiceScope extends ReadonlyMapView<ServiceType, unknown> {
  private _scoped: Map<ServiceType, unknown>;
  private _callbackShare = new CallbackShare();

  constructor() {
    const scoped = new Map<ServiceType, unknown>();
    super(scoped);
    this._scoped = scoped;
  }

  through<T>(type: ServiceType<T>, fulfill: (callback: ValueCallback<T>) => void, then: ValueCallback<T>): void {
    if (this._scoped.has(type)) {
      return then(this._scoped.get(type) as T);
    }

    this._callbackShare(ServiceType.toString(type), callback => {
      fulfill(instance => {
        this._scoped.set(type, instance);
        callback(instance);
      });
    }, then);
  }
}
