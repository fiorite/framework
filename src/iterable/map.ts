import { isPromiseLike, MapCallback, MaybePromiseLike, PromiseAlike } from '../core';
import { getAsyncIterator, getIterator, iteratorFunction, iteratorYield } from './iterator';
import { AsyncIterableOperatorFunction, IterableOperatorFunction } from './operator';
import { AsyncLikeIterable, AsyncLikeIterator } from './async-like';

export function map<T, R>(callback: MapCallback<T, R>): IterableOperatorFunction<T, Iterable<R>> {
  return iteratorFunction(iterator => {
    return () => {
      const result = iterator.next();
      return result.done ? result :
        iteratorYield(callback(result.value as T));
    };
  });
}

export function mapAsync<T, R>(callback: MapCallback<T, MaybePromiseLike<R>>): AsyncIterableOperatorFunction<T, AsyncLikeIterable<R>> {
  return iterable => {
    return {
      [Symbol.asyncIterator](): AsyncLikeIterator<R> {
        const iterator = getAsyncIterator(iterable);
        return {
          next: () => {
            return new PromiseAlike(fulfill => {
              iterator.next().then(result => {
                if (!result.done) {
                  const result2 = callback(result.value);
                  isPromiseLike(result2) ?
                    result2.then(result3 => fulfill({ value: result3 })) :
                    fulfill({ value: result2 });
                } else {
                  fulfill(result);
                }
              });
            });
          },
          return(value?: MaybePromiseLike<unknown>): PromiseLike<IteratorResult<R, unknown>> {
            return new PromiseAlike(fulfill => {
              if (iterator.return) {
                iterator.return(iterator.return(value)).then(result => fulfill(result as IteratorResult<R, unknown>));
              } else {
                fulfill({ done: true, value });
              }
            });
          }
        };
      }
    };
  };
}
