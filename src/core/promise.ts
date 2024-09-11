import { ValueCallback } from 'fiorite/core/callback';

export type MaybePromise<T> = PromiseLike<T> | T;

export namespace MaybePromise {
  function isPromiseLike<T>(object: unknown): object is PromiseLike<T> {
    return object !== null && typeof (object as PromiseLike<T>).then === 'function';
  }

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
