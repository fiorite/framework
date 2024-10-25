import { MaybePromiseLike, PromiseLikeCallback, ValueCallback } from '../core';
import type { AsyncLikeIterable } from './iterable';

export interface AsyncLikeIterator<T> {
  next(): PromiseLikeCallback<IteratorResult<T>>;

  return?(value?: MaybePromiseLike<unknown>): PromiseLikeCallback<IteratorResult<T>>;
}

export interface CallbackBasedIterator<T> {
  readonly async?: boolean;

  readonly iterator: Iterator<T> | AsyncLikeIterator<T>;

  next(callback: ValueCallback<IteratorResult<T>>): void;

  return?(callback?: ValueCallback<IteratorResult<T>>): void;
}

export function getIterator<T>(iterable: Iterable<T> | AsyncLikeIterable<T>): CallbackBasedIterator<T> {
  return new MonoIterator<T>(iterable);
}

/** @deprecated todo: refactor */
class MonoIterator<T> implements CallbackBasedIterator<T> {
  private readonly _async?: boolean;

  get async(): boolean | undefined {
    return this._async;
  }

  private readonly _iterator: Iterator<T> | AsyncLikeIterator<T>;

  get iterator(): Iterator<T> | AsyncLikeIterator<T> {
    return this._iterator;
  }

  private readonly _next: (callback: ValueCallback<IteratorResult<T>>) => void;

  get next(): (callback: ValueCallback<IteratorResult<T>>) => void {
    return this._next;
  }

  private readonly _return?: (callback: ValueCallback<IteratorResult<T>>) => void;

  get return(): ((callback: ValueCallback<IteratorResult<T>>) => void) | undefined {
    return this._return;
  }

  constructor(iterable: Iterable<T> | AsyncLikeIterable<T>) {
    if (Symbol.iterator in iterable) {
      const iterator = iterable[Symbol.iterator]();
      this._iterator = iterator;
      this._next = callback => callback(iterator.next());
      if (iterator.return) {
        this._return = callback => callback ? callback(iterator.return!()) : void 0;
      }
      return;
    }

    if (Symbol.asyncIterator in iterable) {
      const iterator = iterable[Symbol.asyncIterator]();
      this._iterator = iterator;
      this._async = true;
      this._next = callback => iterator.next().then(result => callback(result));
      if (iterator.return) {
        this._return = callback => {
          iterator.return!().then(result => callback ? callback(result) : void 0);
        };
      }
      return;
    }

    throw new Error('neither Iterable nor AsyncIterable.');
  }
}
