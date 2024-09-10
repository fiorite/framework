export class MapWithKeyComparer<K, V> implements Map<K, V>, Iterable<[K, V]> {
  private _data: [K, V][] = [];
  private readonly _keyComparer: (x: K, y: K) => unknown;

  get length(): number {
    return this._data.length;
  }

  constructor(keyComparer: (x: K, y: K) => unknown) {
    this._keyComparer = keyComparer;
  }

  get size(): number {
    return this._data.length;
  }

  entries(): IterableIterator<[K, V]> {
    return this._data[Symbol.iterator]();
  }

  keys(): IterableIterator<K> {
    return this._data.map(entry => entry[0])[Symbol.iterator]();
  }

  values(): IterableIterator<V> {
    return this._data.map(entry => entry[1])[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return 'MapWithComparer';
  }

  readonly [n: number]: [K, V];

  private _indexOf(key: K): number {
    return this._data.findIndex(([x]) => this._keyComparer(x, key));
  }

  has(key: K): boolean {
    return this._indexOf(key) > -1;
  }

  get(key: K): V {
    const index = this._indexOf(key);
    if (index < 0) {
      throw new Error('not found');
    }
    return this._data[index][1];
  }

  set(key: K, value: V): this {
    const index = this._indexOf(key);
    if (index > -1) {
      this._data[index][1] = value;
    } else {
      this._data.push([key, value]);
    }
    return this;
  }

  delete(key: K): boolean {
    const index = this._indexOf(key);
    if (index > -1) {
      this._data.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this._data.splice(0, -1);
  }

  forEach(callback: (value: V, key: K, map: Map<K, V>) => void): void {
    this._data.forEach(([key, value]) => callback(value, key, this));
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this._data[Symbol.iterator]();
  }
}
