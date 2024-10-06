import { MapCallback, promiseWhenNoCallback, ValueCallback, VoidCallback } from '../core';
import { iterableToArray } from './to-array';
import { iterableMap } from './map';
import { iterableForEach } from './for-each';
import { iterableTake } from './take';
import { iterableSkip } from './skip';
import { iterableFirst } from './first';
import { iterableCount } from './count';
import { IterableProjectFunction } from './operator';
import { iterableFilter } from './filter';
import { AsyncLikeIterable } from './iterable';

export class Sequence<T> implements AsyncLikeIterable<T> {
  readonly #iterable: AsyncLikeIterable<T>;

  constructor(iterable: AsyncLikeIterable<T>) {
    this.#iterable = iterable;
  }

  #project<R>(operator: IterableProjectFunction<T, R>): Sequence<R> {
    return new Sequence(operator(this));
  }

  count(callback: ValueCallback<number>): void;
  count(): PromiseLike<number>;
  count(callback?: ValueCallback<number>): unknown {
    return promiseWhenNoCallback(callback => iterableCount(callback)(this), callback);
  }

  filter(predicate: MapCallback<T, unknown>): Sequence<T> {
    return this.#project(iterableFilter<T>(predicate));
  }

  first(callback: ValueCallback<T>): void;
  first(): PromiseLike<T>;
  first(callback?: ValueCallback<T>): unknown {
    return promiseWhenNoCallback(complete => iterableFirst<T>(complete)(this), callback);
  }

  forEach(callback: ValueCallback<T>, done: VoidCallback): void;
  forEach(callback: ValueCallback<T>): PromiseLike<void>;
  forEach(callback: ValueCallback<T>, done?: VoidCallback) {
    return promiseWhenNoCallback(done => iterableForEach(callback, done)(this), done);
  }

  map<R>(callback: MapCallback<T, PromiseLike<R>>): Sequence<R> {
    return this.#project(iterableMap(callback) as IterableProjectFunction<T, R>);
  }

  skip(count: number): Sequence<T> {
    return this.#project(iterableSkip<T>(count));
  }

  take(count: number): Sequence<T> {
    return this.#project(iterableTake<T>(count));
  }

  toArray(): PromiseLike<T[]>;
  toArray(callback: ValueCallback<T[]>): void;
  toArray(callback?: ValueCallback<T[]>): unknown {
    return promiseWhenNoCallback(callback => iterableToArray<T>(callback)(this), callback);
  }

  [Symbol.asyncIterator]() {
    return this.#iterable[Symbol.asyncIterator]();
  }
}
