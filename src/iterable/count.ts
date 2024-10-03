import { ValueCallback } from '../core';
import { monoIterator } from './iterator';
import { IterableOperatorFunction } from './operator';

export function count(callback: ValueCallback<number>): IterableOperatorFunction<unknown, void> {
  return iterable => {
    let counter = 0;
    const iterator = monoIterator(iterable);
    const next = (source: PromiseLike<IteratorResult<unknown>> = iterator.next()) => {
      source.then(result => {
        if (result.done) {
          callback(counter);
        } else {
          counter++;
          next();
        }
      });
    };

    next();
  };
}
