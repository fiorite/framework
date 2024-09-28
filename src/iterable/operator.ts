export type IterableOperatorFunction<T, R> = (iterable: Iterable<T>) => R;

export namespace IterableOperator {
  export function all<T, A>(
    op1: IterableOperatorFunction<T, A>,
  ): IterableOperatorFunction<T, A>;
  export function all<T, A, B>(
    op1: IterableOperatorFunction<T, Iterable<A>>,
    op2: IterableOperatorFunction<A, B>,
  ): IterableOperatorFunction<T, B>;
  export function all<T, A, B, C>(
    op1: IterableOperatorFunction<T, Iterable<A>>,
    op2: IterableOperatorFunction<A, Iterable<B>>,
    op3: IterableOperatorFunction<B, C>,
  ): IterableOperatorFunction<T, C>;
  export function all(...operators: IterableOperatorFunction<unknown, unknown>[]): IterableOperatorFunction<unknown, unknown> {
    const last = operators[operators.length - 1];
    const rest = operators.slice(0, operators.length - 1);
    return iterable => {
      return last(
        (rest.length ? (
          rest.reverse() as IterableOperatorFunction<unknown, unknown>[]
        ).reduce((prev, current) => iterable2 => prev(current(iterable2 as any) as any))(iterable as any) : iterable) as any
      );
    };
  }
}
