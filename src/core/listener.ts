import { AnyCallback, doNothing, FunctionClass, ValueCallback, VoidCallback } from '../core';

export class ListenableFunction<TCallback extends AnyCallback, TEvent> extends FunctionClass<TCallback> {
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
    const closeListener: VoidCallback = (callback: VoidCallback = doNothing) => {
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

export class ListenableFunctionListener {
  private readonly _close: ListenableFunction<VoidCallback, void>;

  get close(): ListenableFunction<VoidCallback, void> {
    return this._close;
  }

  constructor(callback: VoidCallback) {
    this._close = new ListenableFunction(callback);
  }
}

