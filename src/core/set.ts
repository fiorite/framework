import { MapCallback, returnSelf } from './callback';

/**
 * Custom set designed to provide the same signature and the way to configure comparison flow using {@link callback}
 */
export class CustomSet<T, K = unknown> implements Set<T> {
  static readonly data: unique symbol = Symbol('CustomSet.data');

  static readonly callback: unique symbol = Symbol('CustomSet.callback');

  get [Symbol.toStringTag](): string {
    return 'CustomSet';
  }

  // @ts-ignore
  readonly [CustomSet.data] = new Map<R, T>();

  // @ts-ignore
  readonly [CustomSet.callback]: MapCallback<T, K>;

  get size(): number {
    return this[CustomSet.data].size;
  }

  constructor(callback?: MapCallback<T, K>) {
    this[CustomSet.callback] = callback || returnSelf as any;
  }

  add(value: T): this {
    const key = this[CustomSet.callback](value);
    if (!this[CustomSet.data].has(key)) {
      this[CustomSet.data].set(key, value);
    }
    return this;
  }

  // addAll(values: Iterable<T>): this {
  //   for (let value of values) {
  //     this.add(value);
  //   }
  //   return this;
  // }

  clear(): void {
    this[CustomSet.data].clear();
  }

  delete(value: T): boolean {
    return this[CustomSet.data].delete(this[CustomSet.callback](value));
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void { // todo: handle thisArg?
    return this[CustomSet.data].forEach(value => callbackfn(value, value, this));
  }

  has(value: T): boolean {
    return this[CustomSet.data].has(this[CustomSet.callback](value));
  }

  entries(): IterableIterator<[T, T]> {
    const iterator = this[CustomSet.data].values()[Symbol.iterator]();
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
    return this[CustomSet.data].values();
  }

  values(): IterableIterator<T> {
    return this[CustomSet.data].values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this[CustomSet.data].values();
  }
}
