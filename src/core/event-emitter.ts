import { ValueCallback } from './callbacks';

/** @deprecated in development */
export class EventEmitter {
  #listeners = new Map<string, Set<ValueCallback<unknown>>>();

  emit(event: string, value?: unknown): boolean {
    const listeners = this.#listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(value));
      return true;
    }
    return false;
  }

  on(event: string, callback: ValueCallback<unknown>): this {
    let listeners = this.#listeners.get(event);

    if (!listeners) {
      this.#listeners.set(event, listeners = new Set());
    }

    listeners.add(callback); // maybe check for duplicates?

    return this;
    // return {
    //   cancel() {
    //     listeners.delete(callback);
    //   }
    // };
  }

  once(event: string, callback: ValueCallback<unknown>): this {
    let listeners = this.#listeners.get(event);

    if (!listeners) {
      this.#listeners.set(event, listeners = new Set());
    }

    const callback2 = (value: unknown) => {
      listeners.delete(callback2);
      if (!listeners.size) {
        this.#listeners.delete(event);
      }
      callback(value);
    };

    listeners.add(callback2); // maybe check for duplicates?

    return this;
    // return {
    //   cancel() {
    //     listeners.delete(callback2);
    //   }
    // };
  }
}
