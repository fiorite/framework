import { CallbackWithThen, MaybePromiseLike, ValueCallback } from '../core';
import type { AsyncLikeIterable } from './iterable';

export interface AsyncLikeIterator<T, TReturn = unknown> {
  next(): CallbackWithThen<IteratorResult<T, TReturn>>;

  return?(value?: MaybePromiseLike<TReturn>): CallbackWithThen<IteratorResult<T, TReturn>>;
}

export interface CallbackIterator<T> {
  readonly async?: boolean;

  readonly iterator: Iterator<T> | AsyncLikeIterator<T>;

  next(callback: ValueCallback<IteratorResult<T>>): void;

  return?(callback?: ValueCallback<IteratorResult<T>>): void;
}

export function getIterator<T>(iterable: Iterable<T> | AsyncLikeIterable<T>): CallbackIterator<T> {
  return new MonoIterator<T>(iterable);
}

/** @deprecated todo: refactor */
class MonoIterator<T> implements CallbackIterator<T> {
  readonly #async?: boolean;

  get async(): boolean | undefined {
    return this.#async;
  }

  readonly #iterator: Iterator<T> | AsyncLikeIterator<T>;

  get iterator(): Iterator<T> | AsyncLikeIterator<T> {
    return this.#iterator;
  }

  readonly #next: (callback: ValueCallback<IteratorResult<T>>) => void;

  get next(): (callback: ValueCallback<IteratorResult<T>>) => void {
    return this.#next;
  }

  readonly #return?: (callback: ValueCallback<IteratorResult<T>>) => void;

  get return(): ((callback: ValueCallback<IteratorResult<T>>) => void) | undefined {
    return this.#return;
  }

  constructor(iterable: Iterable<T> | AsyncLikeIterable<T>) {
    if (Symbol.iterator in iterable) {
      const iterator = iterable[Symbol.iterator]();
      this.#iterator = iterator;
      this.#next = callback => callback(iterator.next());
      if (iterator.return) {
        this.#return = callback => callback ? callback(iterator.return!()) : void 0;
      }
      return;
    }

    if (Symbol.asyncIterator in iterable) {
      const iterator = iterable[Symbol.asyncIterator]();
      this.#iterator = iterator;
      this.#async = true;
      this.#next = callback => iterator.next().then(result => callback(result));
      if (iterator.return) {
        this.#return = callback => {
          iterator.return!().then(result => callback ? callback(result) : void 0);
        };
      }
      return;
    }

    throw new Error('neither Iterable nor AsyncIterable.');
  }
}
