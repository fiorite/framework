import { ValueCallback } from '../core';
import { IterableOperatorFunction } from './operator';

export function toArray<T>(callback: ValueCallback<T[]>): IterableOperatorFunction<T, void> {
  return iterable => {
    if (Symbol.iterator in iterable) {
      callback(Array.from(iterable));
    } else {
      const array: T[] = [];
      const iterator = iterable[Symbol.asyncIterator]();
      const next = (source: PromiseLike<IteratorResult<T>> = iterator.next()) => {
        source.then(result => {
          if (result.done) {
            callback(array);
          } else {
            array.push(result.value!);
            next();
          }
        });
      };

      next();
    }
  };
}
