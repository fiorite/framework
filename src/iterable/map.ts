import { MapCallback, MaybePromiseLike, PromiseAlike } from '../core';
import { asyncLikeIteratorFunction, iteratorFunction, iteratorYield } from './iterator';
import { AsyncIterableOperatorFunction, SyncIterableOperatorFunction } from './operator';
import { AsyncLikeIterable } from './async-like';

export function map<T, R>(callback: MapCallback<T, R>): SyncIterableOperatorFunction<T, Iterable<R>> {
  return iteratorFunction(iterator => {
    return () => {
      const result = iterator.next();
      return result.done ? result :
        iteratorYield(callback(result.value as T));
    };
  });
}

export function mapAsync<T, R>(callback: MapCallback<T, MaybePromiseLike<R>>): AsyncIterableOperatorFunction<T, AsyncLikeIterable<R>> {
  return asyncLikeIteratorFunction<T, R>(iterator => {
    return () => {
      return new PromiseAlike(fulfill => {
        iterator.next().then(result => {
          if (!result.done) {
            MaybePromiseLike.then(() => callback(result.value), value => {
              fulfill(iteratorYield(value));
            });
          } else {
            fulfill(result);
          }
        });
      });
    };
  });
}
