export interface FunctionClass<TCallback extends (...args: any[]) => any = (...args: any[]) => any> extends Function {
  (...args: Parameters<TCallback>): ReturnType<TCallback>;
}

/**
 * Important class which makes a child class a function.
 * Framework is trying to build abstractions using functions and {@link FunctionClass} can be a substitute.
 * **Important note**: {@link FunctionClass} is not `typeof object`. It is `typeof function`.
 * Please avoid making object check on its children instances.
 */
export abstract class FunctionClass<TCallback extends (...args: any[]) => any> extends Function {
  private readonly _objectCallback: TCallback;

  get objectCallback(): TCallback {
    return this._objectCallback;
  }

  protected constructor(callback: TCallback) {
    super();
    this._objectCallback = callback;
    return new Proxy(this, {
      apply: (target, _, args: Parameters<TCallback>) => {
        return this._objectCallback.apply(target, args);
      }
    });
  }
}
