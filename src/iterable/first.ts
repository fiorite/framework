import { AsyncIterableOperatorFunction } from './operator';
import { PromiseAlike } from '../core';
import { getAsyncIterator } from './iterator';

export class EmptyIterableError {
  readonly name = 'EmptyIterableError';
  readonly message = 'No elements in a sequence.';
}

export function firstAsync<T>(): AsyncIterableOperatorFunction<T, PromiseAlike<T>> {
  return iterable => {
    return new PromiseAlike((complete, fail) => {
      const iterator = getAsyncIterator(iterable);
      iterator.next().then(result => {
        if (result.done) {
          fail(new EmptyIterableError());
          return;
        }
        complete(result.value);
        if (iterator.return) {
          iterator.return();
        }
      });
    });
  };
}
