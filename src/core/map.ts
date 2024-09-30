export class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  static readonly innerMap = Symbol('ReadonlyMapView.innerMap');

  // @ts-ignore
  [ReadonlyMapView.innerMap]: ReadonlyMap<K, V>;

  get size(): number {
    return this[ReadonlyMapView.innerMap].size;
  }

  constructor(innerMap: ReadonlyMap<K, V>) {
    this[ReadonlyMapView.innerMap] = innerMap;
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: any): void {
    return this[ReadonlyMapView.innerMap].forEach(callbackfn, thisArg);
  }

  get(key: K): V | undefined {
    return this[ReadonlyMapView.innerMap].get(key);
  }

  has(key: K): boolean {
    return this[ReadonlyMapView.innerMap].has(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this[ReadonlyMapView.innerMap].entries();
  }

  keys(): IterableIterator<K> {
    return this[ReadonlyMapView.innerMap].keys();
  }

  values(): IterableIterator<V> {
    return this[ReadonlyMapView.innerMap].values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this[ReadonlyMapView.innerMap][Symbol.iterator]();
  }
}
