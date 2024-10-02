import { AsyncIterableOperatorFunction, IterableOperatorFunction } from './operator';
import { PromiseAlike } from '../core';
import { getAsyncIterator } from './iterator';

export function toArray<T>(): IterableOperatorFunction<T, T[]> {
  return iterable => Array.from(iterable);
}

export function toArrayAsync<T>(): AsyncIterableOperatorFunction<T, PromiseAlike<T[]>> {
  return iterable => {
    return new PromiseAlike<T[]>(fulfill => {
      const buffer: T[] = [];

      const iterator = getAsyncIterator(iterable);
      const handler = ((promiseLike: PromiseLike<IteratorResult<T>>) => {
        return promiseLike.then(result => {
          if (result.done) {
            fulfill(buffer);
            return;
          } else {
            buffer.push(result.value);
            return handler(iterator.next());
          }
        });
      }) as any;
      handler(iterator.next());
    });
  };
}
