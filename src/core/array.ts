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
