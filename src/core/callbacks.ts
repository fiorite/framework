import { FunctionClass } from './function-class';
import { MaybePromiseLike } from './promises';

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

/**
 * Neither {@link Promise} nor {@link PromiseLike}. This does not return another instance but `void`.
 * ES6 is still able to `await` the value, so this works in internal stuff.
 * **Important:** avoid using it unless you have a clear reason for it.
 */
export interface ThenableCallback<T> {
  then(onfulfilled: ValueCallback<T>): void;
}

export class ThenableCallback<T> {
  private readonly _executor: (complete: ValueCallback<T>) => void;

  constructor(executor: (complete: ValueCallback<T>) => void) {
    this._executor = executor;
  }

  then(onfulfilled: ValueCallback<T>): void {
    this._executor(onfulfilled);
  }
}

export function thenableCallback<T>(callback: (complete: ValueCallback<T>) => void): ThenableCallback<T> {
  return new ThenableCallback(callback);
}

export class ComputedCallback<T> extends ThenableCallback<T> {
  private _completed?: boolean;

  get completed(): boolean | undefined {
    return this._completed;
  }

  private _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  private _listeners?: ValueCallback<T>[];

  constructor(executor: (complete: ValueCallback<T>) => void) {
    super((callback2: ValueCallback<T>) => {
      if (this._completed) {
        callback2(this._value!);
      } else {
        if (this._listeners) {
          this._listeners.push(callback2);
        } else {
          this._listeners = [callback2];

          const complete = (value: T) => {
            this._value = value;
            this._completed = true;
            while (this._listeners!.length) {
              this._listeners!.shift()!(value);
            }
            delete this._listeners;
          };

          if (executor.length) {
            executor(complete);
          } else {
            MaybePromiseLike.then(() => (executor as () => MaybePromiseLike<T>)(), complete);
          }
        }
      }
    });
  }
}

export function computedCallback<T>(executor: (complete: ValueCallback<T>) => void): ComputedCallback<T> {
  return new ComputedCallback<T>(executor);
}
