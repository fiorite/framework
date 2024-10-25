import { emptyCallback, isPromiseLike, ValueCallback } from '../core';
import { IterableOperatorFunction } from './operator';
import { getIterator } from './iterator';

export function iterableForEach<T>(
  callback: ValueCallback<T>, done: ValueCallback<unknown> = emptyCallback
): IterableOperatorFunction<T, void> {
  return iterable => {
    const iterator = getIterator(iterable);
    const next = () => iterator.next(result => {
      if (result.done) {
        done(result.value);
      } else {
        const result2 = callback(result.value);
        iterator.async && isPromiseLike(result2) ? // maybe optimize
          result2.then(() => next()) : next();
      }
    });
    next();
  };
}
