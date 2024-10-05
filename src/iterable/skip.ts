import { IterableProjectFunction } from './operator';
import { makeIterable } from './iterable';

export function iterableSkip<T>(count: number): IterableProjectFunction<T> {
  return iterable => makeIterable<T>(iterable, iterator => {
    let counter = 0;
    return complete => {
      if (counter >= count) {
        return iterator.next(complete);
      }

      const next = () => {
        if (counter < count) {
          iterator.next(result => {
            counter++;
            result.done ? complete(result) : next();
          });
        } else {
          iterator.next(complete);
        }
      };
      next();
    };
  });
}
