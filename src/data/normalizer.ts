import { TypeTransformer } from './transformer';
import { isPromiseLike, ValueCallback } from '../core';

export class NormalizeFunctionError implements Error {
  readonly name = 'NormalizeFunctionError';
  readonly message = 'Unable to normalize a function value.';
}

export class TransferNormalizer {
  private readonly _transformers: TypeTransformer[];

  constructor(transformers: readonly TypeTransformer[]) {
    this._transformers = transformers.slice();
  }

  add(transformer: TypeTransformer): this {
    this._transformers.push(transformer);
    return this;
  }

  normalize(value: unknown, done: ValueCallback<unknown>): void {
    for (const transformer of this._transformers) {
      if (value instanceof transformer.type) {
        return transformer.transform(value, transformed => this.normalize(transformed, done));
      }
    }

    const valueType = typeof value;

    if (['undefined', 'string', 'boolean', 'number'].includes(valueType) || null === valueType) {
      return done(value);
    }

    if ('function' === value) {
      throw new NormalizeFunctionError();
    }

    if (isPromiseLike(value)) {
      return this._normalizePromiseLike(value, done);
    }

    if (this._isIterable(value)) {
      return this._normalizeIterator(value as Iterable<unknown>, done);
    }

    if (this._isAsyncIterable(value)) {
      return this._normalizeAsyncIterator(value, done);
    }

    this._normalizeRecord(value as Record<string | symbol, unknown>, done);
  }

  private _isIterable<T>(value: unknown): value is Iterable<T> {
    return Symbol.iterator in (value as object);
  }

  private _normalizeIterator(value: Iterable<unknown>, done: ValueCallback<unknown[]>): void {
    const buffer: unknown[] = [];
    const iterator: Iterator<unknown> = (value as any)[Symbol.iterator]();
    const next = (iteratorResult = iterator.next()) => {
      if (iteratorResult.done) {
        done(buffer);
      } else {
        this.normalize(iteratorResult.value, normalized => {
          buffer.push(normalized);
          next();
        });
      }
    };
    next();
  }

  private _isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
    return Symbol.asyncIterator in (value as object);
  }

  private _normalizeAsyncIterator(value: AsyncIterable<unknown>, done: ValueCallback<unknown[]>): void {
    const buffer: unknown[] = [];
    const iterator: AsyncIterator<unknown> = (value as any)[Symbol.asyncIterator]();
    const next = (iteratorResult = iterator.next()) => {
      iteratorResult.then(iteratorResult2 => {
        if (iteratorResult2.done) {
          done(buffer);
        } else {
          this.normalize(iteratorResult2.value, normalized => {
            buffer.push(normalized);
            next();
          });
          next();
        }
      });
    };
    next();
  }

  private _normalizePromiseLike(value: PromiseLike<unknown>, done: ValueCallback<unknown>): void {
    value.then(value2 => this.normalize(value2, done));
  }

  private _normalizeRecord(record: Record<string | symbol, unknown>, done: ValueCallback<unknown>): void {
    const keys = Object.keys(record as object);
    if (!keys.length) {
      return done({});
    }
    const reserved: Record<string | symbol | number, unknown> = {};
    let resolved = 0;
    keys.forEach((key) => {
      this.normalize((record as any)[key], normalized => {
        reserved[key] = normalized;
        resolved++;
        if (resolved === keys.length) {
          done(reserved);
        }
      });
    });
  }
}
