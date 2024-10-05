import { AsyncLikeIterable } from './async-like';
import {
  MapCallback,
  MaybePromiseLike,
  promiseWhenNoCallback,
  PromiseWithSugar,
  ValueCallback,
  VoidCallback
} from '../core';
import { toArray } from './to-array';
import { mapAsync } from './map';
import { forEach } from './for-each';
import { getAsyncIterator } from './iterator';
import { takeAsync } from './take';
import { skipAsync } from './skip';
import { AsyncLikeIterableOperatorFunction } from './operator';
import { first } from './first';
import { count } from './count';

export class Sequence<T> implements AsyncLikeIterable<T> {
  readonly #iterable: AsyncLikeIterable<T>;

  constructor(iterable: AsyncLikeIterable<T>) {
    this.#iterable = iterable;
  }

  #project<R>(operator: AsyncLikeIterableOperatorFunction<T, AsyncLikeIterable<R>>): Sequence<R> {
    return new Sequence(operator(this));
  }

  count(callback: ValueCallback<number>): void;
  count(): PromiseWithSugar<number>;
  count(callback?: ValueCallback<number>): unknown {
    return promiseWhenNoCallback(callback => count(callback)(this), callback);
  }

  first(callback: ValueCallback<T>): void;
  first(): PromiseWithSugar<T>;
  first(callback?: ValueCallback<T>): unknown {
    return promiseWhenNoCallback(complete => first<T>(complete)(this), callback);
  }

  forEach(callback: ValueCallback<T>, done: VoidCallback): void;
  forEach(callback: ValueCallback<T>): PromiseWithSugar<void>;
  forEach(callback: ValueCallback<T>, done?: VoidCallback) {
    return promiseWhenNoCallback(done => forEach(callback, done)(this), done);
  }

  map<R>(callback: MapCallback<T, MaybePromiseLike<R>>): Sequence<R> {
    return this.#project(mapAsync(callback));
  }

  skip(count: number): Sequence<T> {
    return this.#project(skipAsync<T>(count));
  }

  take(count: number): Sequence<T> {
    return this.#project(takeAsync<T>(count));
  }

  toArray(): PromiseWithSugar<T[]>;
  toArray(callback: ValueCallback<T[]>): void;
  toArray(callback?: ValueCallback<T[]>): unknown {
    return promiseWhenNoCallback(callback => toArray<T>(callback)(this), callback);
  }

  [Symbol.asyncIterator]() {
    return getAsyncIterator(this.#iterable);
  }
}
