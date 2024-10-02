import { AsyncIterableOperatorFunction, IterableOperatorFunction } from './operator';
import { PromiseAlike } from '../core';
import { getAsyncIterator } from './iterator';

export function toArray<T>(): IterableOperatorFunction<T, T[]> {
  return iterable => Array.from(iterable);
}

export function toArrayAsync<T>(): AsyncIterableOperatorFunction<T, PromiseAlike<T[]>> {
  return iterable => {
    return new PromiseAlike<T[]>(function (this) {
      const buffer: T[] = [];

      const iterator = getAsyncIterator(iterable);
      const handler = ((promiseLike: PromiseLike<IteratorResult<T>>) => {
        return promiseLike.then(result => {
          if (result.done) {
            if (!this.canceled) {
              this.fulfill(buffer);
            }
            return;
          } else {
            if (this.canceled) {
              if (iterator.return) {
                handler(iterator.return(void 0)); // todo: use throw instead and pass cancellation error
                return;
              }
              return;
            }

            buffer.push(result.value);
            return handler(iterator.next());
          }
        });
      }) as any;
      handler(iterator.next());
    });
  };
}
