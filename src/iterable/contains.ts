import { defaultComparer, EqualityComparer, isPromiseLike, MaybePromiseLike, ValueCallback } from '../core';
import { IterableOperatorFunction } from './operator';
import { getIterator } from './iterator';
import { AsyncLikeIterable } from './iterable';

// todo: refactor, so it looks nice!

export function iterableContains<T>(value: PromiseLike<T>, callback: ValueCallback<boolean>, comparer?: EqualityComparer<T>): (iterable: AsyncLikeIterable<T>) => void;
export function iterableContains<T>(value: T, callback: ValueCallback<boolean>, comparer?: EqualityComparer<T>): IterableOperatorFunction<T, void>;
export function iterableContains<T>(value: MaybePromiseLike<T>, callback: ValueCallback<boolean>, comparer: EqualityComparer<T> = defaultComparer): IterableOperatorFunction<T, void> {
  return iterable => {
    let counter = 0;
    const iterator = getIterator(iterable);
    const completePositive = () => {
      callback(true);
      if (iterator.return) {
        iterator.return();
      }
    };
    const next = () => iterator.next(result => {
      if (result.done) {
        callback(false);
      } else {

        if (iterator.async && isPromiseLike(value)) {
          value.then(value2 => {
            if (comparer(result.value, value2)) {
              completePositive();
            } else {
              next();
            }
          });
        } else {
          if (comparer(result.value, value as T)) {
            completePositive();
          } else {
            next();
          }
        }
      }
    });
    next();
  };
}
