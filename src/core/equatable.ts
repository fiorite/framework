/**
 * Provides an alternative way of equality comparison.
 */
export interface Equatable {
  equals(other: unknown): other is this;
}
