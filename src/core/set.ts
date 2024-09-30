import { MapCallback, returnSelf } from './callback';

/**
 * Custom set designed to provide the same signature and the way to configure comparison flow using {@link keyCallback}
 */
export class SetWithInnerKey<T, K = unknown> implements Set<T> {
  static readonly innerMap: unique symbol = Symbol('CustomSet.data');

  static readonly keyCallback: unique symbol = Symbol('CustomSet.callback');

  get [Symbol.toStringTag](): string {
    return 'CustomSet';
  }

  // @ts-ignore
  readonly [SetWithInnerKey.innerMap] = new Map<R, T>();

  // @ts-ignore
  readonly [SetWithInnerKey.keyCallback]: MapCallback<T, K>;

  get size(): number {
    return this[SetWithInnerKey.innerMap].size;
  }

  constructor(keyCallback?: MapCallback<T, K>) {
    this[SetWithInnerKey.keyCallback] = keyCallback || returnSelf as any;
  }

  add(value: T): this {
    const key = this[SetWithInnerKey.keyCallback](value);
    if (!this[SetWithInnerKey.innerMap].has(key)) {
      this[SetWithInnerKey.innerMap].set(key, value);
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
    this[SetWithInnerKey.innerMap].clear();
  }

  delete(value: T): boolean {
    return this[SetWithInnerKey.innerMap].delete(this[SetWithInnerKey.keyCallback](value));
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void { // todo: handle thisArg?
    return this[SetWithInnerKey.innerMap].forEach(value => callbackfn(value, value, this));
  }

  has(value: T): boolean {
    return this[SetWithInnerKey.innerMap].has(this[SetWithInnerKey.keyCallback](value));
  }

  entries(): IterableIterator<[T, T]> {
    const iterator = this[SetWithInnerKey.innerMap].values()[Symbol.iterator]();
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
    return this[SetWithInnerKey.innerMap].values();
  }

  values(): IterableIterator<T> {
    return this[SetWithInnerKey.innerMap].values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this[SetWithInnerKey.innerMap].values();
  }
}
