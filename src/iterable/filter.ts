import { isPromiseLike, MapCallback } from '../core';
import { makeIterable } from './iterable';
import { IterableProjectFunction } from './operator';

export function iterableFilter<T>(predicate: MapCallback<T, unknown>): IterableProjectFunction<T> {
  return iterable => makeIterable(iterable, iterator => {
    return complete => {
      const next = () => iterator.next(result => {
        if (result.done) {
          return complete(result);
        }

        const result2 = predicate(result.value);
        iterator.async && isPromiseLike(result2) ? result2.then(result3 => {
          result3 ? complete(result) : next();
        }) : result2 ? complete(result) : next();
      });
      next();
    };
  });
}
