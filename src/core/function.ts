import { AnyCallback } from './callback';

export interface FunctionClass<TCallback extends AnyCallback> extends Function {
  (...args: Parameters<TCallback>): ReturnType<TCallback>;
}

export abstract class FunctionClass<TCallback extends AnyCallback> extends Function {
  static lengthOf(object: Function): number {
    // noinspection SuspiciousTypeOfGuard
    return object instanceof FunctionClass ? object.#callback.length : object.length;
  }

  readonly #callback: TCallback;

  protected constructor(callback: TCallback) {
    super();
    this.#callback = callback;
    return new Proxy(this, {
      apply: (target, _, args: Parameters<TCallback>) => {
        return this.#callback.apply(target, args);
      }
    });
  }
}
