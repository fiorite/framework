import { arraySequenceEqual, ValueCallback } from '../core';

/**
 * Uses to connect concurrent callbacks and yet with the same request.
 * Initial call runs and resolve any other subscriptions at the time.
 */
export class ServiceCallbackQueue {
  private _data: [unknown[], ValueCallback<unknown>[]][] = [];

  add<T>(token: unknown[], resolve: (callback: ValueCallback<T>) => void, callback: ValueCallback<T>): void {
    const index = this._data.findIndex(x => arraySequenceEqual(token, x[0]));
    if (index > -1) {
      this._data[index][1].push(callback as ValueCallback<unknown>);
    } else {
      this._data.push([
        [...token], [callback as ValueCallback<unknown>] as ValueCallback<unknown>[]
      ]);

      resolve(value => {
        const index = this._data.findIndex(x => arraySequenceEqual(token, x[0]));
        if (index > -1) {
          this._data[index][1].forEach(callback2 => callback2(value));
          this._data.splice(index);
        }
      });
    }
  }
}
