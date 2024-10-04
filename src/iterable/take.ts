import { AsyncLikeIterableOperatorFunction } from './operator';
import { AsyncLikeIterable } from './async-like';
import { asyncLikeIteratorFunction, iteratorReturn } from './iterator';
import { PromiseWithSugar } from '../core';

export function takeAsync<T>(count: number): AsyncLikeIterableOperatorFunction<T, AsyncLikeIterable<T>> {
  return asyncLikeIteratorFunction<T>(iterator => {
    let counter = 0;
    let done: boolean | undefined;
    return () => { // this is next
      if (counter >= count) {
        if (done!) {
          done = true;
          if (iterator.return) {
            return iterator.return();
          }
        }
        return PromiseWithSugar.resolve<IteratorResult<T>>(iteratorReturn());
      }
      counter++;
      return new PromiseWithSugar(complete => {
        iterator.next().then(result => {
          done = result.done;
          complete(result);
        });
      });
    };
  });
}
