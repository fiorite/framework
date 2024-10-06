/**
 * Async like is specific interface definition which complies with {@link AsyncIterable} structure however,
 * this doesn't require {@link Promise} result but {@link PromiseLike} which can be substituted with non-promise code.
 */

import { AsyncLikeIterator, CallbackIterator, getIterator } from './iterator';
import { CallbackPromiseLike, ValueCallback } from '../core';

export interface AsyncLikeIterable<T> {
  [Symbol.asyncIterator](): AsyncLikeIterator<T>;
}

export interface AsyncLikeIterableIterator<T, TReturn = unknown> extends AsyncLikeIterator<T, TReturn> {
  [Symbol.asyncIterator](): AsyncLikeIterableIterator<T, TReturn>;
}

export type MaybeAsyncLikeIterable<T> = Iterable<T> | AsyncLikeIterableIterator<T>;

export namespace MaybeAsyncLikeIterable {
  export function is<T>(object: unknown): object is MaybeAsyncLikeIterable<T> {
    return null !== object && undefined !== object && (Symbol.iterator in (object as any) || Symbol.asyncIterator in (object as any));
  }
}

/** @deprecated todo: refactor */
class MonoIterable<T, R = T> {
  [Symbol.iterator]?: () => Iterator<R>;
  [Symbol.asyncIterator]?: () => AsyncLikeIterator<R>;

  // static from<T, R = T>(iterable: Iterable<T> | AsyncLikeIterator<T>, makeNext: (iterator: MonoIterator<T>) => (complete: ValueCallback<IteratorResult<R>>) => void,): Iterable<T> | AsyncLikeIterator<T>;
  static from<T, R = T>(
    iterable: Iterable<T> | AsyncLikeIterable<T>,
    makeNext: (iterator: CallbackIterator<T>) => (complete: ValueCallback<IteratorResult<R>>) => void,
  ): typeof iterable extends Iterable<T> ? Iterable<R> : AsyncLikeIterable<R> {
    return new MonoIterable(iterable as any, makeNext) as unknown as typeof iterable extends Iterable<T> ? Iterable<R> : AsyncLikeIterable<R>;
  }

  private constructor(
    iterable: Iterable<T> | AsyncIterable<T>,
    makeNext: (iterator: CallbackIterator<T>) => (complete: ValueCallback<IteratorResult<R>>) => void,
  ) {
    if (Symbol.iterator in iterable) {
      this[Symbol.iterator] = () => {
        const iterator1 = getIterator({
          [Symbol.iterator]: () => iterable[Symbol.iterator](),
        });

        const outerNext = makeNext(iterator1);
        const iterator2: Iterator<R> = {
          next: () => {
            let result: IteratorResult<R>;
            outerNext(x => result = x);
            return result!;
          },
        };

        if (iterator1.iterator.return) {
          iterator2.return = (...args: any[]) => (iterator1.iterator.return as (...args: any[]) => IteratorResult<R>)!(...args);
        }

        return iterator2;
      };
      return;
    }

    if (Symbol.asyncIterator in iterable) {
      this[Symbol.asyncIterator] = () => {
        const iterator1 = getIterator({
          [Symbol.asyncIterator]: () => iterable[Symbol.asyncIterator](),
        });

        const outerNext = makeNext(iterator1);
        const iterator2: AsyncLikeIterator<R> = {
          next: () => {
            return new CallbackPromiseLike(complete => outerNext(complete));
          }
        };

        if (iterator1.return) {
          iterator2.return = () => {
            return new CallbackPromiseLike(complete => {
              iterator1.return!(result => complete(result as IteratorResult<R>));
            });
          };
        }

        return iterator2;
      };
    }
  }
}

export function makeIterable<T, R = T>(
  iterable: Iterable<T> | AsyncLikeIterable<T>,
  prepNext: (iterator: CallbackIterator<T>) => (complete: ValueCallback<IteratorResult<R>>) => void,
): typeof iterable extends Iterable<T> ? Iterable<R> : AsyncLikeIterable<R> {
  return MonoIterable.from(iterable, prepNext);
}
