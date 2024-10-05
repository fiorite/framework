import { ValueCallback } from '../core';
import { IterableOperatorFunction } from './operator';
import { getIterator } from './iterator';

export function iterableCount(callback: ValueCallback<number>): IterableOperatorFunction<unknown, void> {
  return iterable => {
    let counter = 0;
    const iterator = getIterator(iterable);
    const next = () => iterator.next(result => {
      if (result.done) {
        callback(counter);
      } else {
        counter++;
        next();
      }
    });
  };
}
