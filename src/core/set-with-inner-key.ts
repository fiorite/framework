import { MapCallback } from './callbacks';

/**
 * Custom set designed to provide the same signature and the way to configure comparison flow using {@link _keySelector}
 */
export class SetWithInnerKey<T, K = T> implements Set<T> {
  get [Symbol.toStringTag](): string {
    return 'SetWithInnerKey';
  }

  protected readonly _innerMap = new Map<K, T>();
  private readonly _keySelector: MapCallback<T, K>;

  get size(): number {
    return this._innerMap.size;
  }

  constructor(keySelector?: MapCallback<T, K>) {
    this._keySelector = keySelector || (key => key as unknown as K);
  }

  add(value: T): this {
    const key = this._keySelector(value);
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
    return this._innerMap.delete(this._keySelector(value));
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, _thisArg?: any): void { // todo: handle thisArg?
    return this._innerMap.forEach(value => callbackfn(value, value, this));
  }

  has(value: T): boolean {
    return this._innerMap.has(this._keySelector(value));
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
