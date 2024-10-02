import { AsyncLikeIterable, AsyncLikeIterator } from './async-like';

export const getIterator = <T, TReturn = any>(iterable: Iterable<T>): Iterator<T, TReturn> => {
  return iterable[Symbol.iterator]();
};

export const getAsyncIterator = <T, TReturn = any>(iterable: AsyncLikeIterable<T>): AsyncLikeIterator<T> => {
  return iterable[Symbol.asyncIterator]();
}

export type IteratorNextFunction<T> = () => IteratorResult<T>;

export function iteratorFunction<T, R = T>(callback: (iterator: Iterator<T>) => IteratorNextFunction<R>): (iterable: Iterable<T>) => Iterable<R> {
  return iterable => ({
    [Symbol.iterator](): Iterator<R> {
      const iterator = getIterator(iterable);
      return { next: callback(iterator) };
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

export function iteratorReturn(): IteratorReturnResult<void>;
export function iteratorReturn<T>(value: T): IteratorReturnResult<T>;
export function iteratorReturn(value?: unknown): IteratorReturnResult<unknown> {
  return { done: true, value };
}
