import { doNothing, isPromiseLike, ValueCallback } from '../core';
import { monoIterator } from './iterator';
import { AsyncLikeIterable } from './async-like';

export function forEach<T, TReturn = unknown>(
  callback: ValueCallback<T>, done: ValueCallback<TReturn> = doNothing
): (iterable: Iterable<T> | AsyncLikeIterable<T>) => void {
  return iterable => {
    const iterator = monoIterator(iterable);
    const next = (source: PromiseLike<IteratorResult<T>> = iterator.next()) => {
      source.then(result => {
        if (result.done) {
          done(result.value);
        } else {
          const result2 = callback(result.value);
          iterator.async && isPromiseLike(result2) ? // maybe optimize
            result2.then(() => next()) : next();
        }
      });
    };

    next();
  };
}
