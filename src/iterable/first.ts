import { IterableOperatorFunction } from './operator';
import { emptyCallback, ValueCallback } from '../core';
import { getIterator } from './iterator';

/** @deprecated todo: refactored the name */
export class EmptyIterableError {
  readonly name = 'EmptyIterableError';
  readonly message = 'No elements in a sequence.';
}

export function iterableFirst<T>(done: ValueCallback<T>): IterableOperatorFunction<T, void> {
  return iterable => {
    const iterator = getIterator(iterable);
    iterator.next(result => {
      if (result.done) {
        throw new EmptyIterableError();
      }
      done(result.value);
      if (iterator.return) {
        iterator.return(emptyCallback);
      }
    });
  };
}
