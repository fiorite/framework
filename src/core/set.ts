import { MapCallback, returnSelf } from './callback';

/**
 * Custom set designed to provide the same signature and the way to configure comparison flow using {@link _keyCallback}
 */
export class SetWithInnerKey<T, K = T> implements Set<T> {
  get [Symbol.toStringTag](): string {
    return 'CustomSet';
  }

  // @ts-ignore
  private readonly _innerMap = new Map<K, T>();

  get innerMap(): ReadonlyMap<K, T> {
    return this._innerMap;
  }

  private readonly _keyCallback: MapCallback<T, K>;

  get size(): number {
    return this._innerMap.size;
  }

  constructor(keyCallback?: MapCallback<T, K>) {
    this._keyCallback = keyCallback || returnSelf as any;
  }

  add(value: T): this {
    const key = this._keyCallback(value);
    if (!this._innerMap.has(key)) {
      this._innerMap.set(key, value);
    }
    return this;
  }

  addAll(values: Iterable<T>): this {
    for (let value of values) {
      this.add(value);
    }
    return this;
  }

  clear(): void {
    this._innerMap.clear();
  }

  delete(value: T): boolean {
    return this._innerMap.delete(this._keyCallback(value));
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void { // todo: handle thisArg?
    return this._innerMap.forEach(value => callbackfn(value, value, this));
  }

  has(value: T): boolean {
    return this._innerMap.has(this._keyCallback(value));
  }

  entries(): IterableIterator<[T, T]> {
    const iterator = this._innerMap.values()[Symbol.iterator]();
    const result: IterableIterator<[T, T]> = {
      next(): IteratorResult<[T, T]> {
        const result = iterator.next();
        return result.done ? { done: true, value: undefined } : {
          done: false, value: [result.value, result.value] as [T, T]
        };
      },
      [Symbol.iterator]: () => result,
    };
    return result;
  }

  keys(): IterableIterator<T> {
    return this._innerMap.values();
  }

  values(): IterableIterator<T> {
    return this._innerMap.values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._innerMap.values();
  }
}
