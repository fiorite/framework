import { MapCallback } from '../core';
import { makeIterable } from './iterable';
import { IterableProjectFunction } from './operator';

export function iterableFilter<T>(predicate: MapCallback<T, unknown>): IterableProjectFunction<T> {
  return iterable => makeIterable(iterable, iterator => {
    return complete => {
      const next = () => iterator.next(result => {
        if (result.done || predicate(result.value)) {
          complete(result);
        } else {
          next();
        }
      });
      next();
    };
  });
}
