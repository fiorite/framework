import { AsyncLikeIterable } from './async-like';

export type SyncIterableOperatorFunction<T, R> = (iterable: Iterable<T>) => R;

export type AsyncIterableOperatorFunction<T, R> = (iterable: AsyncLikeIterable<T>) => R;

export type IterableOperatorFunction<T, R> = (iterable: Iterable<T> | AsyncLikeIterable<T>) => R;

export namespace SyncIterableOperator {
  export function all<T, A>(
    op1: SyncIterableOperatorFunction<T, A>,
  ): SyncIterableOperatorFunction<T, A>;
  export function all<T, A, B>(
    op1: SyncIterableOperatorFunction<T, Iterable<A>>,
    op2: SyncIterableOperatorFunction<A, B>,
  ): SyncIterableOperatorFunction<T, B>;
  export function all<T, A, B, C>(
    op1: SyncIterableOperatorFunction<T, Iterable<A>>,
    op2: SyncIterableOperatorFunction<A, Iterable<B>>,
    op3: SyncIterableOperatorFunction<B, C>,
  ): SyncIterableOperatorFunction<T, C>;
  export function all(...operators: SyncIterableOperatorFunction<unknown, unknown>[]): SyncIterableOperatorFunction<unknown, unknown> {
    const last = operators[operators.length - 1];
    const rest = operators.slice(0, operators.length - 1);
    return iterable => {
      return last(
        (rest.length ? (
          rest.reverse() as SyncIterableOperatorFunction<unknown, unknown>[]
        ).reduce((prev, current) => iterable2 => prev(current(iterable2 as any) as any))(iterable as any) : iterable) as any
      );
    };
  }
}
