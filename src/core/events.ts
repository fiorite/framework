import { ValueCallback } from './callbacks';

export class EventEmitter<T = Record<string | symbol, unknown>> {
  private readonly _listeners = new Map<string | symbol | number, Map<Function, Function>>();

  emit<K extends keyof T>(event: K, value: T[K]): boolean {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(value));
      return true;
    }
    return false;
  }

  private _on<K extends keyof T>(event: K, listener: ValueCallback<T[K]>, actual: ValueCallback<T[K]>): void {
    let listeners = this._listeners.get(event);

    if (!listeners) {
      this._listeners.set(event, listeners = new Map());
    }
    listeners.set(listener, actual);
  }


  on<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this {
    this._on(event, callback, callback);
    return this;
  }

  off<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this {
    let listeners = this._listeners.get(event);

    if (listeners && listeners.delete(callback)) {
      if (!listeners.size) {
        this._listeners.delete(event);
      }
    }

    return this;
  }

  once<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this {
    const actual = (value: T[K]) => {
      this.off(event, callback);
      callback(value);
    }

    this._on(event, callback, actual);
    return this;
  }
}

export class SingleEventEmitter<T = void> extends EventEmitter<{ event: T }> {
  override emit(value: T): boolean
  override emit(event: 'event', value: T): boolean;
  override emit(...args: unknown[]): boolean {
    return args.length <= 1 ?
      super.emit('event', args[0] as T) :
      super.emit(args[0] as 'event', args[1] as T);
  }

  override on(callback: ValueCallback<T>): this;
  override on(event: 'event', callback: ValueCallback<T>): this;
  override on(...args: unknown[]): this {
    return args.length === 1 ?
      super.on('event', args[0] as ValueCallback<T>) :
      super.on(args[0] as 'event', args[1] as ValueCallback<T>);
  }

  override off(callback: ValueCallback<T>): this;
  override off(event: 'event', callback: ValueCallback<T>): this;
  override off(...args: unknown[]): this {
    return args.length === 1 ?
      super.off('event', args[0] as ValueCallback<T>) :
      super.off(args[0] as 'event', args[1] as ValueCallback<T>);
  }

  override once(callback: ValueCallback<T>): this;
  override once(event: 'event', callback: ValueCallback<T>): this;
  override once(...args: unknown[]): this {
    return args.length === 1 ?
      super.once('event', args[0] as ValueCallback<T>) :
      super.once(args[0] as 'event', args[1] as ValueCallback<T>);
  }
}
