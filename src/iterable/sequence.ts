import { AsyncLikeIterable } from './async-like';
import {
  MapCallback,
  MaybePromiseLike,
  PromiseAlike,
  promiseLikeWhenNoCallback,
  ValueCallback,
  VoidCallback
} from '../core';
import { toArray } from './to-array';
import { mapAsync } from './map';
import { forEach } from './for-each';
import { getAsyncIterator } from './iterator';
import { takeAsync } from './take';
import { skipAsync } from './skip';
import { AsyncIterableOperatorFunction } from './operator';
import { first } from './first';
import { count } from './count';

export class AsyncSequence<T> implements AsyncLikeIterable<T> {
  readonly #iterable: AsyncLikeIterable<T>;

  constructor(iterable: AsyncLikeIterable<T>) {
    this.#iterable = iterable;
  }

  #withOperator<R>(operator: AsyncIterableOperatorFunction<T, AsyncLikeIterable<R>>): AsyncSequence<R> {
    return new AsyncSequence(operator(this));
  }

  count(callback: ValueCallback<number>): void;
  count(): PromiseAlike<number>;
  count(callback?: ValueCallback<number>): unknown {
    return promiseLikeWhenNoCallback(callback => count(callback)(this), callback);
  }

  first(callback: ValueCallback<T>): void;
  first(): PromiseAlike<T>;
  first(callback?: ValueCallback<T>): unknown {
    return promiseLikeWhenNoCallback(complete => first<T>(complete)(this), callback);
  }

  forEach(callback: ValueCallback<T>, done: VoidCallback): void;
  forEach(callback: ValueCallback<T>): PromiseAlike<void>;
  forEach(callback: ValueCallback<T>, done?: VoidCallback) {
    return promiseLikeWhenNoCallback(done => forEach(callback, done)(this), done);
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

  toArray(): PromiseAlike<T[]>;
  toArray(callback: ValueCallback<T[]>): void;
  toArray(callback?: ValueCallback<T[]>): unknown {
    return promiseLikeWhenNoCallback(callback => toArray<T>(callback)(this), callback);
  }

  [Symbol.asyncIterator]() {
    return getAsyncIterator(this.#iterable);
  }
}
