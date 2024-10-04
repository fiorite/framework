/**
 * Async like is specific interface definition which complies with {@link AsyncIterable} structure however,
 * this doesn't require {@link Promise} result but {@link PromiseLike} which can be substituted with non-promise code.
 */

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
