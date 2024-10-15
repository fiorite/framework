import { AsyncLikeIterable } from './iterable';

export type IterableOperatorFunction<T, R1, R2 = R1> = (iterable: Iterable<T> | AsyncLikeIterable<T>) => typeof iterable extends Iterable<T> ? R1 : R2;

export type IterableProjectFunction<T, R1 = T, R2 = R1> = IterableOperatorFunction<T, Iterable<R1>, AsyncLikeIterable<R2>>;

// /** @deprecated experimental rxjs like thing */
// export namespace IterableOperator {
//   export function all<T, A1, A2>(
//     op1: IterableOperatorFunction<T, A1, A2>,
//   ): IterableOperatorFunction<T, A1, A2>;
//   export function all<T, A, B1, B2>(
//     op1: IterableProjectFunction<T, A>,
//     op2: IterableOperatorFunction<A, B1, B2>,
//   ): IterableOperatorFunction<T, B1, B2>;
//   export function all<T, A, B, C1, C2>(
//     op1: IterableProjectFunction<T, A>,
//     op2: IterableProjectFunction<A, B>,
//     op3: IterableOperatorFunction<B, C1, C2>,
//   ): IterableOperatorFunction<T, C1, C2>;
//   export function all(...operators: IterableOperatorFunction<unknown, unknown>[]): IterableOperatorFunction<unknown, unknown> {
//     const last = operators[operators.length - 1];
//     const rest = operators.slice(0, operators.length - 1);
//     return iterable => {
//       return last(
//         (rest.length ? (
//           rest.reverse() as IterableOperatorFunction<unknown, unknown>[]
//         ).reduce((prev, current) => iterable2 => prev(current(iterable2 as any) as any))(iterable as any) : iterable) as any
//       );
//     };
//   }
// }
