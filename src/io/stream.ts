import { doNothing, ValueCallback, VoidCallback } from '../core';
import { Closeable, CloseFunction, MaybeErrorCallback } from './close';
import { ListenableFunction } from './listen';

type FlushCallback = MaybeErrorCallback;

type ReadFunction<T> = ValueCallback<ValueCallback<T>>;

type WriteFunction<T> = (value: T, callback?: FlushCallback) => void;

const nullReader = () => {
  throw new Error('Stream is closed or reader is not set.');
};

const nullWriter = () => {
  throw new Error('Stream is closed or writer is not set.');
};

export class CustomStream<T> implements Closeable {
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

  private readonly _originalClose: ValueCallback<VoidCallback> = callback => callback(); // todo: add callback

  private readonly _close: ListenableFunction<CloseFunction, void>;

  get close(): ListenableFunction<CloseFunction, void> {
    return this._close;
  }

  private _closed = false;

  get closed(): boolean {
    return this._closed;
  }

  constructor(object: {
    readonly reader?: ReadFunction<T>;
    readonly writer?: WriteFunction<T>,
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

    this._close = new ListenableFunction((callback: FlushCallback = doNothing) => {
      this._originalClose(() => {
        this._reader = nullReader;
        this._readable = false;
        this._writer = nullWriter;
        this._writable = false;
        this._closed = true;
        this._close.emit(); // emit event
        callback();
      });
    });

    if (!this.readable && !this.writable) {
      this.close(doNothing);
    }
  }

  read(callback: ValueCallback<T>): void {
    this._reader(callback);
  }

  write(value: T, callback: FlushCallback = doNothing): void {
    this._writer(value, callback);
  }
}
