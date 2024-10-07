import { isPromiseLike, MapCallback } from '../core';
import { IterableProjectFunction } from './operator';
import { AsyncLikeIterable, makeIterable } from './iterable';

export function iterableMap<T, R = T>(callback: MapCallback<T, PromiseLike<R>>): (iterable: AsyncLikeIterable<T>) => AsyncLikeIterable<R>;
export function iterableMap<T, R = T>(callback: MapCallback<T, R>): IterableProjectFunction<T, R>;
export function iterableMap<T, R = T>(callback: MapCallback<T, R>): IterableProjectFunction<T, R, R extends PromiseLike<infer P> ? P : R> {
  return (iterable: Iterable<T> | AsyncLikeIterable<T>) => makeIterable<T, R extends PromiseLike<infer P> ? P : R>(iterable, iterator => {
    return complete => {
      iterator.next(result => {
        if (result.done) {
          return complete(result);
        }

        const value1 = callback(result.value);
        iterator.async && isPromiseLike(value1) ?
          value1.then(value2 => complete({ value: value2 } as any)) :
          complete({ value: value1 } as any);
      });
    };
  });
}
