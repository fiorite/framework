import { FunctionClass } from './function';

export type AnyCallback = (...args: any[]) => any;

export type ValueCallback<T> = (value: T) => void;

export type MapCallback<T, R> = (value: T) => R;

export const returnSelf: MapCallback<unknown, unknown> = value => value;

export type PredicateCallback<T> = (value: T) => unknown;

export type VoidCallback = () => void;

export const doNothing = () => void 0;

export type CallbackShareFunction = <T>(key: string | symbol | number, fulfill: (callback: ValueCallback<T>) => void, done: ValueCallback<T>) => void;

export interface CallbackShare {
  <T>(key: string | symbol | number, fulfill: (callback: ValueCallback<T>) => void, then: ValueCallback<T>): void;
}

/**
 * Uses to connect concurrent callbacks and yet with the same request.
 * Initial call runs and resolve any other subscriptions at the time.
 */
export class CallbackShare extends FunctionClass<CallbackShareFunction> {
  private _queue = new Map<string | symbol | number, ValueCallback<unknown>[]>();

  constructor() {
    super((key, fulfill, done) => {
      if (this._queue.has(key)) {
        this._queue.get(key)!.push(done as ValueCallback<unknown>);
      } else {
        this._queue.set(key, [done as ValueCallback<unknown>]);
        fulfill(value => {
          const array = (this._queue.get(key) || []);
          this._queue.delete(key);
          array.forEach(callback2 => callback2(value));
        });
      }
    });
  }
}
