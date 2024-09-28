import { MapCallback } from '../core';
import { iteratorFunction, iteratorYield } from './iterator';
import { IterableOperatorFunction } from './operator';

export function map<T, R>(callback: MapCallback<T, R>): IterableOperatorFunction<T, Iterable<R>> {
  return iteratorFunction(iterator => {
    return () => {
      const result = iterator.next();
      return result.done ? result :
        iteratorYield(callback(result.value as T));
    };
  });
}
