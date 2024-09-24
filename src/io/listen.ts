import { AnyCallback, doNothing, FunctionClass, ValueCallback, VoidCallback } from '../core';
import { Closeable, CloseFunction, MaybeErrorCallback } from './close';

export interface Listenable<TCallback extends AnyCallback = VoidCallback> {
  listen(callback: TCallback): Closeable;
}

export class ListenableFunction<TCallback extends AnyCallback, TEvent> extends FunctionClass<TCallback> implements Listenable<ValueCallback<TEvent>> {
  private _listeners: ValueCallback<TEvent>[] = [];

  constructor(callback: TCallback) {
    super(callback);
  }

  /** @deprecated used internally, need to think where to move later */
  emit(event: TEvent): void {
    this._listeners.forEach(callback => callback(event));
  }

  listen(callback: ValueCallback<TEvent>): ListenableFunctionListener {
    if (!this._listeners.includes(callback)) {
      this._listeners.push(callback);
    }

    let listener: ListenableFunctionListener;
    const closeListener: CloseFunction = (callback: MaybeErrorCallback = doNothing) => {
      const index = this._listeners.indexOf(callback);
      if (index > -1) {
        this._listeners.splice(index, 1);
        listener.close.emit();
        callback(); // todo: rewind
      }
    };

    listener = new ListenableFunctionListener(closeListener);
    return listener;
  }
}

export class ListenableFunctionListener implements Closeable {
  private readonly _close: ListenableFunction<CloseFunction, void>;

  get close(): ListenableFunction<CloseFunction, void> {
    return this._close;
  }

  constructor(close: CloseFunction) {
    this._close = new ListenableFunction(close);
  }
}

