import { AnyCallback } from './callback';

export interface FunctionClass<TCallback extends AnyCallback> extends Function {
  (...args: Parameters<TCallback>): ReturnType<TCallback>;
}

export abstract class FunctionClass<TCallback extends AnyCallback> extends Function {
  static readonly callback: unique symbol = Symbol('FunctionClass.callback');
  // @ts-ignore
  readonly [FunctionClass.callback]!: TCallback;

  protected constructor(callback: TCallback) {
    super();
    this[FunctionClass.callback] = callback;
    return new Proxy(this, {
      apply: (target, _, args: Parameters<TCallback>) => {
        return callback.apply(target, args);
      }
    });
  }
}

