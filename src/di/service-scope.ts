import { ServiceType } from './service-type';
import { CallbackShare, ListenableFunction, ValueCallback } from '../core';

export class ServiceScope {
  private _data = new Map<ServiceType, unknown>();
  private _resultShare = new CallbackShare();

  // private _destroy: ListenableFunction<any, any>

  get<T>(type: ServiceType<T>, fulfill: (callback: ValueCallback<T>) => void, then: ValueCallback<T>): void {
    if (this._data.has(type)) {
      return then(this._data.get(type) as T);
    }

    this._resultShare(ServiceType.toString(type), callback => {
      fulfill(instance => {
        this._data.set(type, instance);
        callback(instance);
      });
    }, then);
  }

  destroy(): void {
    while (this._data.size) {
      this._data.forEach((value, key) => {
        this._data.delete(key);
        const object = value as object;
        if (
          'onScopeDestroy' in object &&
          null !== object &&
          typeof object['onScopeDestroy'] === 'function'
        ) {
          object.onScopeDestroy();
        }
      });
    }
  }
}

export interface OnScopeDestroy {
  onScopeDestroy(): void;
}
