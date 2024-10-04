import { AsyncLikeIterableOperatorFunction } from './operator';
import { AsyncLikeIterable } from './async-like';
import { asyncLikeIteratorFunction, iteratorReturn } from './iterator';
import { PromiseWithSugar } from '../core';

export function skipAsync<T>(count: number): AsyncLikeIterableOperatorFunction<T, AsyncLikeIterable<T>> {
  return asyncLikeIteratorFunction<T>(iterator => {
    let counter = 0;
    let done: boolean | undefined;
    return () => { // this is next
      if (done) {
        return PromiseWithSugar.resolve<IteratorResult<T>>(iteratorReturn());
      }

      return new PromiseWithSugar(fulfill => {
        const handle = () => {
          if (counter < count) {
            counter++;
            iterator.next().then(result => {
              done = result.done;
              if (done) {
                fulfill(result);
              } else {
                handle();
              }
            });
          } else {
            iterator.next().then(result => {
              done = result.done;
              fulfill(result);
            });
          }
        };
        handle();
      });
    };
  });
}
