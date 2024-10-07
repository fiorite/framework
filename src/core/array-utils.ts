export function arraySequenceEqual(x: readonly unknown[], y: readonly unknown[]): boolean {
  if (x.length !== y.length) {
    return false;
  }

  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) {
      return false;
    }
  }

  return true;
}

export function arrayRange(from: number, to: number): number[] {
  const buffer = [];
  for (let i = from; i <= to; i++) {
    buffer.push(i);
  }
  return buffer;
}

export type MaybeArray<T> = T | T[];

export namespace MaybeArray {
  export function toArray<T>(value: MaybeArray<T>): T[] {
    return Array.isArray(value) ? value : [value];
  }
}
