import { FunctionClass } from './function-class';

export type AnyCallback = (...args: any[]) => any;

export type ValueCallback<T> = (value: T) => void;

export type MapCallback<T, R> = (value: T) => R;

export const returnSelf: MapCallback<unknown, unknown> = value => value;

/** @deprecated no use, could be deleted */
export type PredicateCallback<T> = (value: T) => unknown;

export type VoidCallback = () => void;

export const doNothing = () => void 0;

export type CallbackShareFunction = <T>(key: string | symbol | number, complete: (callback: ValueCallback<T>) => void, then: ValueCallback<T>) => void;

export interface CallbackShare {
  <T>(key: string | symbol | number, complete: (callback: ValueCallback<T>) => void, then: ValueCallback<T>): void;
}

/**
 * Enqueue concurrent callbacks. In case there a pending {@link key} callback,
 * only the first {@link complete} is applied and
 * result is shared among all {@link then} up until callback completes.
 */
export class CallbackShare extends FunctionClass<CallbackShareFunction> {
  private _queue = new Map<string | symbol | number, ValueCallback<unknown>[]>();

  constructor() {
    super((key, complete, then) => {
      if (this._queue.has(key)) {
        this._queue.get(key)!.push(then as ValueCallback<unknown>);
      } else {
        this._queue.set(key, [then as ValueCallback<unknown>]);
        complete(value => {
          const array = (this._queue.get(key) || []);
          this._queue.delete(key);
          array.forEach(callback2 => callback2(value));
        });
      }
    });
  }
}

export class CallbackForceValueError {
  readonly name = 'CallbackForceValueError';
  readonly message = 'Unable to force synchronous value.';
  // todo: provide then() alternative
}

/**
 * @throws CallbackForceValueError
 */
export const forceCallbackValue = <T>(callback: (catchValue: ValueCallback<T>) => void): T => {
  let caught: boolean | undefined;
  let value: T | undefined;
  callback(innerValue => {
    caught = true;
    value = innerValue;
  });
  if (!caught) {
    throw new CallbackForceValueError();
  }
  return value!;
};
