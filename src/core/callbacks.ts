import { FunctionClass } from './function-class';

/**
 * Callback which is free from parameters or return value.
 */
export type VoidCallback = () => void;

/**
 * Callback which receives {@link value} as the only parameter.
 * {@link ValueCallback<void>} the same as {@link VoidCallback}
 */
export type ValueCallback<T> = (value: T) => void;

/**
 * Callback which receives {@link value} and projects a new value out of it.
 * `MapCallback<T, void>` the same as `ValueCallback<T>` and
 * `MapCallback<void>` the same as `ValueCallback<void>` and `VoidCallback`.
 */
export type MapCallback<T, R = T> = (value: T) => R;

/**
 * Considered to be the default callback which does nothing.
 * Used to avoid undefined check in working pieces.
 */
export const emptyCallback = () => void 0;

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
  #queue = new Map<string | symbol | number, ValueCallback<unknown>[]>();

  constructor() {
    super((key, complete, then) => {
      if (this.#queue.has(key)) {
        this.#queue.get(key)!.push(then as ValueCallback<unknown>);
      } else {
        this.#queue.set(key, [then as ValueCallback<unknown>]);
        complete(value => {
          const array = (this.#queue.get(key) || []);
          this.#queue.delete(key);
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
