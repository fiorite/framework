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
  private readonly _iterable: AsyncLikeIterable<T>;
  private readonly _comparer: EqualityComparer<T>;

  constructor(iterable: AsyncLikeIterable<T>, comparer: EqualityComparer<T> = defaultComparer) {
    this._iterable = iterable;
    this._comparer = comparer;
  }

  private _operate<R>(operator: IterableProjectFunction<T, R>, comparer: EqualityComparer<R>): AsyncSequence<R> {
    return new AsyncSequence(operator(this), comparer);
  }

  contains(value: MaybePromiseLike<T>, callback: ValueCallback<boolean>): void;
  contains(value: MaybePromiseLike<T>): PromiseLike<boolean>;
  contains(value: MaybePromiseLike<T>, callback?: ValueCallback<boolean>): unknown {
    return promiseWhenNoCallback(callback => iterableContains(value as T, callback, this._comparer)(this), callback);
  }

  count(callback: ValueCallback<number>): void;
  count(): PromiseLike<number>;
  count(callback?: ValueCallback<number>): unknown {
    return promiseWhenNoCallback(callback => iterableCount(callback)(this), callback);
  }

  filter(predicate: MapCallback<T, MaybePromiseLike<unknown>>): AsyncSequence<T> {
    return this._operate(iterableFilter<T>(predicate), this._comparer);
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

  map<R>(callback: MapCallback<T, MaybePromiseLike<R>>, comparer: EqualityComparer<R> = defaultComparer): AsyncSequence<R> {
    return this._operate(iterableMap(callback) as IterableProjectFunction<T, R>, comparer);
  }

  skip(count: number): AsyncSequence<T> {
    return this._operate(iterableSkip<T>(count), this._comparer);
  }

  take(count: number): AsyncSequence<T> {
    return this._operate(iterableTake<T>(count), this._comparer);
  }

  toArray(): PromiseLike<T[]>;
  toArray(callback: ValueCallback<T[]>): void;
  toArray(callback?: ValueCallback<T[]>): unknown {
    return promiseWhenNoCallback(callback => iterableToArray<T>(callback)(this), callback);
  }

  [Symbol.asyncIterator]() {
    return this._iterable[Symbol.asyncIterator]();
  }
}
