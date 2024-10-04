import { AsyncLikeIterableOperatorFunction } from './operator';
import { AsyncLikeIterable } from './async-like';
import { asyncLikeIteratorFunction, iteratorReturn } from './iterator';
import { PromiseAlike } from '../core';

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
        return PromiseAlike.value<IteratorResult<T>>(iteratorReturn());
      }
      counter++;
      return new PromiseAlike(fulfill => {
        iterator.next().then(result => {
          done = result.done;
          fulfill(result);
        });
      });
    };
  });
}
