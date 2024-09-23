import { FunctionClass, VoidCallback } from '../core';
import { HttpCallback } from './callback';
import { HttpMiddleware } from './middleware';

class MiddlewareBridge extends FunctionClass<HttpMiddleware> {
  constructor(a: HttpMiddleware, b: HttpMiddleware) {
    super((context, next) => {
      a(context, () => b(context, next));
    });
  }
}

const errorFallback: VoidCallback = () => {
  throw new Error('http pipeline fallback is bound to throw error.');
};

export class HttpPipeline extends FunctionClass<HttpCallback> implements Set<HttpMiddleware> {
  get [Symbol.toStringTag](): string {
    return 'HttpPipeline';
  }

  private readonly _array: HttpMiddleware[] = [];

  get size(): number {
    return this._array.length;
  }

  private _callback: HttpCallback;
  private readonly _fallback: VoidCallback;

  constructor(array: Iterable<HttpMiddleware> = [], fallback: VoidCallback = errorFallback) {
    super(context => this._callback(context));
    this._fallback = fallback;
    this._callback = fallback;
    this._array.push(...array);
    this._rebuild();
  }

  private _rebuild(): void {
    if (this._array.length) {
      const callback = this._array.reverse().reduce((bridge, next) => new MiddlewareBridge(next, bridge));
      this._callback = context => callback(context, this._fallback);
    } else {
      this._callback = this._fallback;
    }
  }

  add(value: HttpMiddleware): this {
    if (!this._array.includes(value)) {
      this._array.push(value);
      this._rebuild();
    }
    return this;
  }

  clear(): void {
    this._array.splice(0, -1);
    this._rebuild();
  }

  delete(value: HttpMiddleware): boolean {
    const index = this._array.indexOf(value);
    if (index > -1) {
      this._array.splice(index, 1);
      this._rebuild();
      return true;
    }
    return false;
  }

  forEach(callbackfn: (value: HttpMiddleware, value2: HttpMiddleware, set: Set<HttpMiddleware>) => void): void {
    return this._array.forEach(middleware => {
      return callbackfn(middleware, middleware, this);
    });
  }

  has(value: HttpMiddleware): boolean {
    return this._array.includes(value);
  }

  entries(): IterableIterator<[HttpMiddleware, HttpMiddleware]> {
    return this._array.map<[HttpMiddleware, HttpMiddleware]>(middleware => {
      return [middleware, middleware];
    })[Symbol.iterator]();
  }

  keys(): IterableIterator<HttpMiddleware> {
    return this._array[Symbol.iterator]();
  }

  values(): IterableIterator<HttpMiddleware> {
    return this._array[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<HttpMiddleware> {
    return this._array[Symbol.iterator]();
  }
}
