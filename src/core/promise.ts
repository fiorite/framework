import { MapCallback, ValueCallback, VoidCallback } from './callback';

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

export class PromiseAlikeCanceledError implements Error {
  readonly name = 'PromiseAlikeCanceledError';
  readonly message = 'PromiseAlike was canceled.';
}

export class PromiseAlikeFulfilledError implements Error {
  readonly name = 'PromiseAlikeFulfilledError';
  readonly message = 'PromiseAlike was fulfilled.';
}

export class PromiseAlikeProtectedError implements Error {
  readonly name = 'PromiseAlikeProtectedError';
  readonly message = 'PromiseAlike is protected. Unable to #fulfill() it twice.';
}

/**
 * experimental alternative to {@link Promise} in order to connect callbacks.
 */
export class PromiseAlike<T> implements PromiseLike<T> {
  /**
   * lock functional, blocks another call of {@link fulfill}.
   * @private
   */
  #protected?: boolean;

  #fulfilled?: boolean;

  /**
   * tells whether instance is completed.
   */
  get fulfilled(): boolean | undefined {
    return this.#fulfilled;
  }

  #value?: T;

  /**
   * provides a value which become shared after
   */
  get value(): T | undefined {
    return this.#value;
  }

  #canceled?: boolean;

  get canceled(): boolean | undefined {
    return this.#canceled;
  }

  #listeners?: Set<ValueCallback<T | undefined>>;

  static value<T>(value: T): PromiseAlike<T> {
    return new PromiseAlike<T>(fulfill => fulfill(value));
  }

  constructor(callback?: (this: PromiseAlike<T>, fulfill: ValueCallback<T | PromiseLike<T>>) => void) {
    if (callback) {
      callback.call(this, this.fulfill.bind(this));
    }
  }

  #ensureNotCanceled(): void {
    if (this.#canceled) {
      throw new PromiseAlikeCanceledError();
    }
  }

  fulfill(value: T | PromiseLike<T>): void {
    this.#ensureNotCanceled();
    if (this.#protected) {
      throw new PromiseAlikeProtectedError();
    }

    this.#protected = true;

    return MaybePromiseLike.then(() => value, resolved => {
      this.#ensureNotCanceled();
      this.#fulfilled = true;
      this.#value = resolved;
      this.#completeListeners(resolved);
    });
  }

  #ensureNotFulfilled(): void {
    if (this.#fulfilled) {
      throw new PromiseAlikeFulfilledError();
    }
  }

  cancel(): void {
    this.#ensureNotFulfilled();
    this.#canceled = true;
    this.#completeListeners(void 0);
  }

  #addListener(callback: ValueCallback<T | undefined>): void {
    if (!this.#listeners) {
      this.#listeners = new Set();
    }
    this.#listeners.add(callback);
  }

  #completeListeners(value?: T): void {
    if (this.#listeners) {
      this.#listeners.forEach(callback => callback(value));
      this.#listeners.clear();
      this.#listeners = undefined;
    }
  }

  then<R = T>(callback?: MapCallback<T, MaybePromiseLike<R>>): PromiseLike<R>;
  then<R = T>(callback?: MapCallback<T, MaybePromiseLike<R>>, onrejected?: ValueCallback<unknown>): PromiseLike<R> {
    this.#ensureNotCanceled();

    if (!callback) {
      return this as PromiseLike<R>;
    }

    if (this.#fulfilled) {
      return new PromiseAlike(fulfill => fulfill(callback(this.value!)));
    }

    if (onrejected) {
      const source = this;
      return new PromiseAlike(function (this) {
        source.#addListener(value => {
          if (source.canceled) {
            onrejected(new PromiseAlikeCanceledError());
            this.cancel();
            return;
          }
          this.fulfill(callback(value as T));
        });
      });
    }

    return new Promise((resolve, reject) => { // fallback to Promise to handle #cancel()
      this.#addListener(value => {
        this.canceled ? reject(new PromiseAlikeCanceledError()) :
          resolve(callback(value!));
      });
    });
  }
}
