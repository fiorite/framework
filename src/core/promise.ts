import { MapCallback, ValueCallback } from './callback';

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
 * experimental alternative to {@link Promise} in order to connect callbacks.
 */
export class PromiseAlike<T> implements PromiseLike<T> {
  private _protected = false;

  private _fulfilled = false;

  get fulfilled(): boolean {
    return this._fulfilled;
  }

  private _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  private _listeners: ValueCallback<T>[] = [];

  get callback(): ValueCallback<T> {
    return this.fulfill.bind(this);
  }

  static value<T>(value: T): PromiseAlike<T> {
    const future = new PromiseAlike<T>();
    future.fulfill(value);
    return future;
  }

  constructor(callback?: (fulfill: ValueCallback<T | PromiseLike<T>>) => void) {
    if (callback) {
      callback(this.fulfill.bind(this));
    }
  }

  fulfill(value: T | PromiseLike<T>): void {
    if (this._protected) {
      throw new Error('unable to fulfill twice the same PromiseAlike');
    }

    this._protected = true;
    const resolve = (value2: T) => {
      this._fulfilled = true;
      this._value = value2;
      while (this._listeners.length) {
        this._listeners.shift()!(value2);
      }
    };

    isPromiseLike(value) ? value.then(resolve) : resolve(value);
  }

  then<R = T>(callback?: MapCallback<T, MaybePromiseLike<R>>): PromiseLike<R> {
    if (!callback) {
      return this as unknown as PromiseLike<R>;
    }

    if (this._fulfilled) {
      return PromiseAlike.value(this._value as R);
    }

    return new PromiseAlike<R>(fulfill => this._listeners.push(value => fulfill(callback(value) as R)));
  }
}
