import { FunctionClass, VoidCallback } from '../core';
import { HttpCallback } from './callback';
import { HttpStatusCode } from './status-code';

class MiddlewareBridge extends FunctionClass<HttpCallback> {
  constructor(a: HttpCallback, b: HttpCallback) {
    super((context, next) => {
      a(context, () => b(context, next));
    });
  }
}

const errorFallback: VoidCallback = () => {
  throw new Error('http pipeline fallback is bound to throw error.');
};

const defaultFallback: HttpCallback = (context, next) => {
  if (!context.response.headersSent && undefined === context.response.statusCode) {
    context.response.statusCode = HttpStatusCode.NotFound;
  }

  context.response.close();

  next();
};

export class HttpPipeline extends FunctionClass<HttpCallback> implements Set<HttpCallback> {
  get [Symbol.toStringTag](): string {
    return 'HttpPipeline';
  }

  private readonly _array: HttpCallback[] = [];

  get size(): number {
    return this._array.length;
  }

  private _callback: HttpCallback;
  private readonly _fallback: HttpCallback;

  constructor(array: Iterable<HttpCallback> = [], fallback: HttpCallback = defaultFallback) {
    super((context, next) => this._callback(context, () => fallback(context, next)));
    this._fallback = fallback;
    this._callback = errorFallback;
    this._array.push(...array);
    this._rebuild();
  }

  private _rebuild(): void {
    if (this._array.length) {
      this._callback = this._array.reverse().reduce((bridge, next) => new MiddlewareBridge(next, bridge));
    } else {
      this._callback = errorFallback;
    }
  }

  add(value: HttpCallback): this {
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

  delete(value: HttpCallback): boolean {
    const index = this._array.indexOf(value);
    if (index > -1) {
      this._array.splice(index, 1);
      this._rebuild();
      return true;
    }
    return false;
  }

  forEach(callbackfn: (value: HttpCallback, value2: HttpCallback, set: Set<HttpCallback>) => void): void {
    return this._array.forEach(middleware => {
      return callbackfn(middleware, middleware, this);
    });
  }

  has(value: HttpCallback): boolean {
    return this._array.includes(value);
  }

  entries(): IterableIterator<[HttpCallback, HttpCallback]> {
    return this._array.map<[HttpCallback, HttpCallback]>(middleware => {
      return [middleware, middleware];
    })[Symbol.iterator]();
  }

  keys(): IterableIterator<HttpCallback> {
    return this._array[Symbol.iterator]();
  }

  values(): IterableIterator<HttpCallback> {
    return this._array[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<HttpCallback> {
    return this._array[Symbol.iterator]();
  }
}
