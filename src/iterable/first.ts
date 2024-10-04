import { IterableOperatorFunction } from './operator';
import { ValueCallback } from '../core';
import { monoIterator } from './iterator';

/** @deprecated todo: refactored the name */
export class EmptyIterableError {
  readonly name = 'EmptyIterableError';
  readonly message = 'No elements in a sequence.';
}

export function first<T>(callback: ValueCallback<T>): IterableOperatorFunction<T, void> {
  return iterable => {
    const iterator = monoIterator(iterable);
    iterator.next().then(result => {
      if (result.done) {
        throw new EmptyIterableError();
      }
      callback(result.value);
      if (iterator.return) {
        iterator.return().then(() => {
          // do nothing perhaps
        });
      }
    });
  };
}
