export function range(from: number, to: number): number[] {
  const buffer = [];
  for (let i = from; i <= to; i++) {
    buffer.push(i);
  }
  return buffer;
}
