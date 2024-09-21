import { ValueCallback, VoidCallback } from '../core';
import { Closeable } from './close';
import { ListenableFunction } from './listen';

type ReadFunction<T> = ValueCallback<ValueCallback<T>>;

type WriteFunction<T> = ValueCallback<T>;

const nullReader = () => {
  throw new Error('Stream is closed or reader is not set.');
};

const nullWriter = () => {
  throw new Error('Stream is closed or writer is not set.');
};

export class Stream<T> implements Closeable {
  private _reader: ReadFunction<T> = nullReader;

  private _readable = false;

  get readable(): boolean {
    return this._readable;
  }

  private _writer: WriteFunction<T> = nullWriter;

  private _writable = false;

  get writable(): boolean {
    return this._writable;
  }

  private readonly _originalClose: VoidCallback = () => void 0;

  private readonly _close: ListenableFunction<() => void, void>;

  get close(): ListenableFunction<VoidCallback, void> {
    return this._close;
  }

  private _closed = false;

  get closed(): boolean {
    return this._closed;
  }

  constructor(object: {
    readonly reader?: ValueCallback<ValueCallback<T>>;
    readonly writer?: ValueCallback<T>,
    readonly close?: VoidCallback,
  } = {}) {
    if (object.reader) {
      this._readable = true;
      this._reader = object.reader;
    }

    if (object.writer) {
      this._writable = true;
      this._writer = object.writer;
    }

    if (object.close) {
      this._originalClose = object.close;
    }

    this._close = new ListenableFunction(() => {
      this._originalClose();
      this._reader = nullReader;
      this._readable = false;
      this._writer = nullWriter;
      this._writable = false;
      this._closed = true;
      this._close.emit(); // emit event
    });

    if (!this.readable && !this.writable) {
      this.close();
    }
  }

  read(callback: ValueCallback<T>): void {
    this._reader(callback);
  }

  write(value: T): void {
    this._writer(value);
  }
}
