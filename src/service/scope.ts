import { ServiceKey } from './key';
import { ValueCallback } from '../core';
import { ServiceCallbackQueue } from './_queue';

export class ServiceScope {
  private _data = new Map<ServiceKey, unknown>();
  private _queue = new ServiceCallbackQueue();

  provide<T>(serviceKey: ServiceKey<T>, callback: ValueCallback<T>, instantiate: (callback: ValueCallback<T>) => void): void {
    if (this._data.has(serviceKey)) {
      return callback(this._data.get(serviceKey) as T);
    }

    this._queue.add([this, 'scopeFactory', serviceKey], callback2 => {
      instantiate(instance => {
        this._data.set(serviceKey, instance);
        callback2(instance);
      });
    }, callback);
  }

  destroyScope(): void {
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
