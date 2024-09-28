import { doNothing, ValueCallback } from '../core';
import { getIterator } from './iterator';
import { IterableOperatorFunction } from './operator';

export function forEach<T, TReturn = unknown>(callback: ValueCallback<T>, done: ValueCallback<TReturn> = doNothing): IterableOperatorFunction<T, void> {
  return iterable => {
    const iterator = getIterator<T, TReturn>(iterable);
    let result = iterator.next();
    while (!result.done) {
      callback(result.value);
      result = iterator.next();
    }
    done(result.value);
  };
}
