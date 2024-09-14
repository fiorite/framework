export type AnyFunction = (...args: any[]) => any;

export interface FunctionClass<TFunction extends AnyFunction> extends Function {
  (...args: Parameters<TFunction>): ReturnType<TFunction>;
}

export abstract class FunctionClass<TFunction extends AnyFunction> extends Function {
  protected constructor(caller: TFunction) {
    super();
    return new Proxy(this, {
      apply(target, _, args: Parameters<TFunction>) {
        return caller.apply(this, args);
      },
    });
  }
}

