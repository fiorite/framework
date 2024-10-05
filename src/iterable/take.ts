import { IterableProjectFunction } from './operator';
import { makeIterable } from './iterable';

export function iterableTake<T>(count: number): IterableProjectFunction<T> {
  return iterable => makeIterable<T>(iterable, iterator => {
    let counter = 0;
    return complete => {
      if (counter >= count) {
        return iterator.return ?
          iterator.return(complete) :
          complete({ done: true, value: void 0 });
      }
      counter++;
      iterator.next(complete);
    };
  });
}
