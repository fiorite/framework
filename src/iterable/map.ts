import { MapCallback, MaybePromiseLike, PromiseWithSugar } from '../core';
import { asyncLikeIteratorFunction, iteratorFunction, iteratorYield } from './iterator';
import { AsyncLikeIterableOperatorFunction, SyncIterableOperatorFunction } from './operator';
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

export function mapAsync<T, R>(callback: MapCallback<T, MaybePromiseLike<R>>): AsyncLikeIterableOperatorFunction<T, AsyncLikeIterable<R>> {
  return asyncLikeIteratorFunction<T, R>(iterator => {
    return () => {
      return new PromiseWithSugar(complete => {
        iterator.next().then(result => {
          if (!result.done) {
            MaybePromiseLike.then(() => callback(result.value), value => {
              complete(iteratorYield(value));
            });
          } else {
            complete(result);
          }
        });
      });
    };
  });
}
