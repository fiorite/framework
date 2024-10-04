import { AnyCallback } from './callback';

export interface FunctionClass<TCallback extends AnyCallback> extends Function {
  (...args: Parameters<TCallback>): ReturnType<TCallback>;
}

/**
 * Important class which makes a child class a function.
 * Framework is trying to build abstractions using functions and {@link FunctionClass} can be a substitute.
 * **Important note**: {@link FunctionClass} is not `typeof object`. It is `typeof function`.
 */
export abstract class FunctionClass<TCallback extends AnyCallback> extends Function {
  readonly #callback: TCallback;

  /**
   * Exposes inner callback to validate, for example, number of arguments `instance[Symbol.species].length`.
   */
  get [Symbol.species](): TCallback {
    return this.#callback;
  }

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
