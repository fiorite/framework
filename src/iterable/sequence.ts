import { AsyncLikeIterable } from './async-like';
import { MapCallback, MaybePromiseLike, PromiseAlike, ValueCallback, VoidCallback } from '../core';
import { toArrayAsync } from './to-array';
import { mapAsync } from './map';
import { forEachAsync } from './for-each';
import { getAsyncIterator } from './iterator';
import { takeAsync } from './take';
import { skipAsync } from './skip';
import { AsyncIterableOperatorFunction } from './operator';
import { firstAsync } from './first';

export class AsyncSequence<T> implements AsyncLikeIterable<T> {
  readonly #iterable: AsyncLikeIterable<T>;

  constructor(iterable: AsyncLikeIterable<T>) {
    this.#iterable = iterable;
  }

  #withOperator<R>(operator: AsyncIterableOperatorFunction<T, AsyncLikeIterable<R>>): AsyncSequence<R> {
    return new AsyncSequence(operator(this));
  }

  first(): PromiseLike<T> {
    return firstAsync<T>()(this);
  }

  forEach(callback: ValueCallback<T>, done: VoidCallback): void;
  forEach(callback: ValueCallback<T>): PromiseAlike<void>;
  forEach(callback: ValueCallback<T>, done?: VoidCallback): void | PromiseAlike<void> {
    if (done) {
      forEachAsync(callback, done)(this);
      return;
    }

    return forEachAsync(callback)(this);
  }

  map<R>(callback: MapCallback<T, MaybePromiseLike<R>>): AsyncSequence<R> {
    return this.#withOperator(mapAsync(callback));
  }

  skip(count: number): AsyncSequence<T> {
    return this.#withOperator(skipAsync<T>(count));
  }

  take(count: number): AsyncSequence<T> {
    return this.#withOperator(takeAsync<T>(count));
  }

  toArray(): PromiseAlike<T[]> {
    return toArrayAsync<T>()(this);
  }

  [Symbol.asyncIterator]() {
    return getAsyncIterator(this.#iterable);
  }
}
