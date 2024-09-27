import { ServiceType } from './type';
import { ValueCallback } from '../core';
import { ServiceCallbackQueue } from './_queue';

export class ServiceScope {
  private _data = new Map<ServiceType, unknown>();
  private _resultShare = new ServiceCallbackQueue();

  provide<T>(type: ServiceType<T>, resolve: ValueCallback<T>, create: (callback: ValueCallback<T>) => void): void {
    if (this._data.has(type)) {
      return resolve(this._data.get(type) as T);
    }

    this._resultShare.add([this, 'scopeFactory', type], callback2 => {
      create(instance => {
        this._data.set(type, instance);
        callback2(instance);
      });
    }, resolve);
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
