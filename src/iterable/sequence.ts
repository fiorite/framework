import {
  defaultComparer,
  EqualityComparer,
  MapCallback,
  MaybePromiseLike,
  promiseWhenNoCallback,
  ValueCallback,
  VoidCallback
} from '../core';
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
import { iterableContains } from './contains';

export class AsyncSequence<T> implements AsyncLikeIterable<T> {
  readonly #iterable: AsyncLikeIterable<T>;
  readonly #comparer: EqualityComparer<T>;

  constructor(iterable: AsyncLikeIterable<T>, comparer: EqualityComparer<T> = defaultComparer) {
    this.#iterable = iterable;
    this.#comparer = comparer;
  }

  #project<R>(operator: IterableProjectFunction<T, R>): AsyncSequence<R> {
    return new AsyncSequence(operator(this), this.#comparer as unknown as EqualityComparer<R>);
  }

  contains(value: MaybePromiseLike<T>, callback: ValueCallback<boolean>): void;
  contains(value: MaybePromiseLike<T>): PromiseLike<boolean>;
  contains(value: MaybePromiseLike<T>, callback?: ValueCallback<boolean>): unknown {
    return promiseWhenNoCallback(callback => iterableContains(value as T, callback, this.#comparer)(this), callback);
  }

  count(callback: ValueCallback<number>): void;
  count(): PromiseLike<number>;
  count(callback?: ValueCallback<number>): unknown {
    return promiseWhenNoCallback(callback => iterableCount(callback)(this), callback);
  }

  filter(predicate: MapCallback<T, MaybePromiseLike<unknown>>): AsyncSequence<T> {
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

  /** @deprecated Array method, will not be removed however, prefer contains (like RxJS).  */
  includes(value: MaybePromiseLike<T>, callback: ValueCallback<boolean>): void;
  /** @deprecated Array method, will not be removed however, prefer contains (like RxJS).  */
  includes(value: MaybePromiseLike<T>): PromiseLike<boolean>;
  includes(value: MaybePromiseLike<T>, callback?: ValueCallback<boolean>): unknown {
    return this.contains(value, callback as any);
  }

  map<R>(callback: MapCallback<T, PromiseLike<R>>): AsyncSequence<R> {
    return this.#project(iterableMap(callback) as IterableProjectFunction<T, R>);
  }

  skip(count: number): AsyncSequence<T> {
    return this.#project(iterableSkip<T>(count));
  }

  take(count: number): AsyncSequence<T> {
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
