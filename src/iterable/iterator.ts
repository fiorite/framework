import { AsyncLikeIterable, AsyncLikeIterator } from './async-like';
import { AsyncLikeIterableOperatorFunction } from './operator';
import { MaybePromiseLike, PromiseAlike, ConstValuePromiseLike } from '../core';
import { isIterable } from './iterable';

export const getIterator = <T, TReturn = any>(iterable: Iterable<T>): Iterator<T, TReturn> => {
  return iterable[Symbol.iterator]();
};

export const getAsyncIterator = <T, TReturn = any>(iterable: AsyncLikeIterable<T>): AsyncLikeIterator<T> => {
  return iterable[Symbol.asyncIterator]();
};

export type IteratorNextFunction<T> = () => IteratorResult<T>;

export function iteratorFunction<T, R = T>(callback: (iterator: Iterator<T>) => IteratorNextFunction<R>): (iterable: Iterable<T>) => Iterable<R> {
  return iterable => ({
    [Symbol.iterator](): Iterator<R> {
      const iterator1 = getIterator(iterable);
      const iterator2: Iterator<R> = { next: callback(iterator1) };
      if (iterator1.return) {
        iterator2.return = (value?: unknown) => iterator1.return!(value) as IteratorResult<R>;
      }
      return iterator2;
    }
  });
}

// export type AsyncIteratorNextFunction<T> = () => Promise<IteratorResult<T>>;
//
// export function asyncIteratorFunction<T, R = T>(callback: (iterator: AsyncIterator<T>) => AsyncIteratorNextFunction<R>): (iterable: AsyncIterable<T>) => AsyncIterable<R> {
//   return iterable => ({
//     [Symbol.asyncIterator](): AsyncIterator<R> {
//       const iterator = getAsyncIterator(iterable);
//       return { next: callback(iterator) };
//     }
//   });
// }

export function iteratorYield<T>(value: T): IteratorYieldResult<T> {
  return { value };
}

export function iteratorReturn<T = void>(): IteratorReturnResult<T>;
export function iteratorReturn<T>(value: T): IteratorReturnResult<T>;
export function iteratorReturn(value?: unknown): IteratorReturnResult<unknown> {
  return { done: true, value };
}

export type AsyncLikeIteratorNextFunction<T> = () => PromiseLike<IteratorResult<T>>;

export function asyncLikeIteratorFunction<T, R = T>(
  callback: (iterator: AsyncLikeIterator<T>) => AsyncLikeIteratorNextFunction<R>,
): AsyncLikeIterableOperatorFunction<T, AsyncLikeIterable<R>> {
  return iterable => {
    return {
      [Symbol.asyncIterator](): AsyncLikeIterator<R> {
        const iterator1 = getAsyncIterator(iterable);
        const iterator2: AsyncLikeIterator<R> = {
          next: callback(iterator1),
        };
        if (iterator1.return) {
          iterator2.return = (value?: MaybePromiseLike<unknown>) => {
            return new PromiseAlike(fulfill => {
              iterator1.return!(value).then(result => fulfill(result as any));
            });
          };
        }
        return iterator2;
      }
    };
  };
}

/** @deprecated experimental feature */
export const monoIterator = <T>(iterable: Iterable<T> | AsyncLikeIterable<T>): AsyncLikeIterator<T> & { async?: boolean } => {
  if (isIterable(iterable)) {
    const iterator = getIterator(iterable);
    return {
      next: () => new ConstValuePromiseLike(iterator.next()),
    };
  }

  const iterator = getAsyncIterator(iterable);
  return {
    async: true,
    next: () => iterator.next(),
  };
};
