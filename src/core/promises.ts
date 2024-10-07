import { ValueCallback } from './callbacks';
import { Type } from './type';

export type MaybePromiseLike<T> = PromiseLike<T> | T;

export function isPromiseLike<T>(object: unknown): object is PromiseLike<T> {
  return null !== object && undefined !== object && typeof (object as PromiseLike<T>).then === 'function';
}

export namespace MaybePromiseLike {
  const rethrowError: (err: unknown) => void = err => {
    throw err;
  };

  export function then<T>(
    callback: () => PromiseLike<T> | T,
    resolve: ValueCallback<T>,
    reject: (err: unknown) => void = rethrowError
  ): void {
    const handler = (value: PromiseLike<T> | T): void => {
      isPromiseLike(value) ? value.then(handler, reject) : resolve(value as T);
    };

    try {
      handler(callback());
    } catch (err) {
      reject(err);
    }
  }

  export function all(
    callback: () => readonly (PromiseLike<unknown> | unknown)[],
    resolve: ValueCallback<unknown[]>,
    reject: (err: unknown) => void = rethrowError
  ): void {
    let array: readonly (PromiseLike<unknown> | unknown)[];

    try {
      array = callback();
    } catch (err) {
      return reject(err);
    }

    if (!array.length) {
      return resolve([]);
    }

    const buffer = new Array(array.length);
    let resolved = 0;

    const handler = (value: PromiseLike<unknown> | unknown, index: number): void => {
      if (isPromiseLike(value)) {
        value.then(value2 => handler(value2, index), reject);
      } else {
        buffer[index] = value;
        resolved++;
        if (resolved >= array.length) {
          resolve(buffer);
        }
      }
    };

    array.forEach(handler);
  }
}

/**
 * Framework version of Promise extended with useful overloads. Will be added #cancel() logic later.
 * @deprecated thinking of removing or changing the name.
 * @example```
 * promiseWithSugar.catch(CustomError, (error: CustomError) => {
 *    // handle a specific error.
 * });
 * ```
 */
export class PromiseWithSugar<T> extends Promise<T> {
  override catch<TResult2 = never>(onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseWithSugar<T | TResult2>;
  override catch<T extends Error, R = never>(type: Type<T>, onrejected: (reason: T) => R | PromiseLike<R>): PromiseWithSugar<R>
  override catch<TResult2 = never>(...args: unknown[]): PromiseWithSugar<T | TResult2> {
    if (args.length === 2) {
      return this.then(undefined, error => {
        if (error instanceof (args[0] as Type)) {
          return (args[1] as Function)(error);
        }
        throw error;
      });
    }

    return this.then(undefined, args[0] as any);
  }

  override then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => (PromiseLike<TResult1> | TResult1)) | undefined | null, onrejected?: ((reason: any) => (PromiseLike<TResult2> | TResult2)) | undefined | null): PromiseWithSugar<TResult1 | TResult2> {
    return new PromiseWithSugar((resolve, reject) => {
      super.then(value => {
        try {
          resolve((onfulfilled ? onfulfilled(value) : value) as any);
        } catch (error) {
          reject(error);
        }
      }, error => {
        if (onrejected) {
          try {
            resolve(onrejected(error));
          } catch (error) {
            reject(error);
          }
        }
        reject(error);
      });
    });
  }
}

export function promiseWhenNoCallback<T>(handler: (complete: ValueCallback<T>) => void): PromiseWithSugar<T>;
export function promiseWhenNoCallback<T>(handler: (complete: ValueCallback<T>) => void, callback: ValueCallback<T>): void;
export function promiseWhenNoCallback<T>(handler: (complete: ValueCallback<T>) => void, callback?: ValueCallback<T>): unknown;
export function promiseWhenNoCallback<T>(handler: (complete: ValueCallback<T>) => void, callback?: ValueCallback<T>): unknown {
  return callback ? handler(callback) : new PromiseWithSugar((complete, fail) => {
    try {
      handler(complete);
    } catch (error) {
      fail(error);
    }
  });
}

// /** @deprecated another experimental {@link PromiseLike} which returns same value again and again. Used in mono iterator implementation. */
// export class ValuePromiseLike<T> implements PromiseLike<T> {
//   readonly #value: T;
//
//   get value(): T {
//     return this.#value;
//   }
//
//   constructor(value: T) {
//     this.#value = value;
//   }
//
//   then<TResult1 = T>(onfulfilled?: ((value: T) => void) | null | undefined): PromiseLike<TResult1> {
//     if (onfulfilled) {
//       onfulfilled(this.#value);
//     }
//
//     return this as unknown as PromiseLike<TResult1>;
//   }
// }

/**
 * Not {@link Promise}, simulates signature and runs {@link CallbackPromiseLike.callback}.
 * @deprecated use {@link callbackPromiseLike}.
 */
class CallbackPromiseLike<T> implements PromiseLike<T> {
  readonly #callback: (complete: ValueCallback<T>) => void;

  get callback(): (complete: ValueCallback<T>) => void {
    return this.#callback;
  }

  constructor(callback: (complete: ValueCallback<T>) => void) {
    this.#callback = callback;
  }

  then<TResult1 = T>(onfulfilled?: ((value: T) => void) | null | undefined): PromiseLike<TResult1> {
    if (onfulfilled) {
      this.#callback((value: T) => {
        onfulfilled(value);
      });
    }
    return this as unknown as PromiseLike<TResult1>;
  }
}

export function callbackPromiseLike<T>(callback: (then: ValueCallback<T>) => void): PromiseLike<T> {
  return new CallbackPromiseLike(callback);
}
