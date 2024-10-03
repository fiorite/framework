export class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  readonly #innerMap: ReadonlyMap<K, V>;

  get innerMap(): ReadonlyMap<K, V> {
    return this.#innerMap;
  }

  get size(): number {
    return this.innerMap.size;
  }

  constructor(innerMap: ReadonlyMap<K, V>) {
    this.#innerMap = innerMap;
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: any): void {
    return this.innerMap.forEach(callbackfn, thisArg);
  }

  get(key: K): V | undefined {
    return this.innerMap.get(key);
  }

  has(key: K): boolean {
    return this.innerMap.has(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this.innerMap.entries();
  }

  keys(): IterableIterator<K> {
    return this.innerMap.keys();
  }

  values(): IterableIterator<V> {
    return this.innerMap.values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.innerMap[Symbol.iterator]();
  }
}
