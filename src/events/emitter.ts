import { AbstractType, Type, ValueCallback } from '../core';

export class EventEmitter<T = unknown> {
  private readonly _listeners = new Map<string | symbol | number | Function, Map<Function, Function>>();

  emit<K extends keyof T>(event: K, value: T[K]): boolean;
  emit<P>(event: AbstractType<P>, value: P): boolean;
  emit(event: object): boolean;
  emit<P>(event: string | symbol | number | Function, value: P): boolean;
  emit(...args: unknown[]): boolean {
    let event: string | symbol | number | Function, value: unknown;

    if (1 === args.length) {
      event = (args[0] as object).constructor;
      value = (args[0] as object);
    } else {
      event = args[0] as string | symbol | number | Function;
      value = args[1] as unknown;
    }


    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(value));
      return true;
    }
    return false;
  }

  private _on(event: string | symbol | number | Function, listener: Function, actual: Function): void {
    let listeners = this._listeners.get(event);

    if (!listeners) {
      this._listeners.set(event, listeners = new Map());
    }
    listeners.set(listener, actual);
  }


  on<P>(event: string | symbol | number, callback: ValueCallback<P>): this;
  on<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this;
  on<P>(event: AbstractType<P>, callback: ValueCallback<P>): this;
  on(event: string | symbol | number | Function, callback: Function): this {
    this._on(event, callback, callback);
    return this;
  }

  off<P>(event: AbstractType<P>, callback: ValueCallback<P>): this;
  off<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this;
  off(event: string | symbol | number | Function, callback: Function): this {
    let listeners = this._listeners.get(event);

    if (listeners && listeners.delete(callback)) {
      if (!listeners.size) {
        this._listeners.delete(event);
      }
    }

    return this;
  }

  once<P>(event: string | symbol | number, callback: ValueCallback<P>): this;
  once<R>(event: Type<R>, callback: ValueCallback<R>): this;
  once<K extends keyof T>(event: K, callback: ValueCallback<T[K]>): this;
  once(event: string | symbol | number | Function, callback: Function): this {
    const actual = (value: unknown) => {
      (this.off as Function)(event, callback);
      callback(value);
    };

    this._on(event, callback, actual);
    return this;
  }
}
