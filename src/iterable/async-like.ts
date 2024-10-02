// interface AsyncIterator<T, TReturn = any, TNext = undefined> {
//     // NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
//     next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
//     return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>;
//     throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
// }

import { MaybePromiseLike } from '../core';

export interface AsyncLikeIterator<T, TReturn = unknown> {
  next(): PromiseLike<IteratorResult<T, TReturn>>;

  return?(value?: MaybePromiseLike<TReturn>): PromiseLike<IteratorResult<T, TReturn>>;
}

export interface AsyncLikeIterable<T> {
  [Symbol.asyncIterator](): AsyncLikeIterator<T>;
}

export interface AsyncLikeIterableIterator<T, TReturn = unknown> extends AsyncLikeIterator<T, TReturn> {
  [Symbol.asyncIterator](): AsyncLikeIterableIterator<T, TReturn>;
}
