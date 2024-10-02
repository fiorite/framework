import { doNothing, isPromiseLike, PromiseAlike, ValueCallback } from '../core';
import { getAsyncIterator, getIterator } from './iterator';
import { AsyncIterableOperatorFunction, IterableOperatorFunction } from './operator';

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

export function forEachAsync<T, TReturn = unknown>(
  callback: ValueCallback<T>, done: ValueCallback<TReturn> = doNothing
): AsyncIterableOperatorFunction<T, PromiseAlike<void>> {
  return iterable => {
    return new PromiseAlike<void>(function (this) {
      const iterator = getAsyncIterator(iterable);
      const recursion = ((promiseLike: PromiseLike<IteratorResult<T>>) => {
        return promiseLike.then(result => {
          if (result.done) {
            done(result.value);
            if (!this.canceled) {
              this.fulfill();
            }
            return;
          } else {
            const mapped = callback(result.value);
            if (isPromiseLike(mapped)) {
              return mapped.then(() => recursion(iterator.next()));
            }

            if (this.canceled) { // check if promise was canceled.
              if (iterator.return) {
                return recursion(iterator.return());
              }

              done(undefined as TReturn);
              return;
            }

            return recursion(iterator.next());
          }
        });
      }) as any;
      recursion(iterator.next());
    });
  };
}
