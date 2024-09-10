/** @deprecated not done yet */
export class SetWithComparer<T> implements Iterable<T> {
  private _data: T[] = [];
  private readonly _comparer: (x: T, y: T) => unknown;

  get length(): number {
    return this._data.length;
  }

  constructor(comparer: (x: T, y: T) => unknown = (x, y) => x === y) {
    this._comparer = comparer;
  }

  private _indexOf(item: T): number {
    return this._data.findIndex(x => this._comparer(x, item));
  }

  has(item: T): boolean {
    return this._indexOf(item) > -1;
  }

  add(item: T): void {
    const index = this._indexOf(item);
    if (index > -1) {
      throw new Error('Item already set: ' + String(item));
    }
    this._data.push(item);
  }

  delete(item: T): boolean {
    const index = this._indexOf(item);
    if (index > -1) {
      this._data.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this._data.splice(0, -1);
  }

  forEach(callback: (item: T, index: number) => void): void {
    this._data.forEach(callback);
  }

  [Symbol.iterator](): Iterator<T> {
    return this._data[Symbol.iterator]();
  }
}
