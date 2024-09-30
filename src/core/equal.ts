export interface Equatable {
  equals(other: unknown): other is this;
}
