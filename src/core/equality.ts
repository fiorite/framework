/**
 * Provides an alternative way of equality comparison.
 */
export interface Equatable {
  equals(other: unknown): other is this;
}

export type EqualityComparer<T> = (x: T, y: T) => unknown;

export const defaultComparer: EqualityComparer<unknown> = (x, y) => x === y;
