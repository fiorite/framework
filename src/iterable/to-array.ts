import { IterableOperatorFunction } from './operator';

export function toArray<T>(): IterableOperatorFunction<T, T[]> {
  return iterable => Array.from(iterable);
}
