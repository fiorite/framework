export type AnyFunction = (...args: any[]) => any;

export interface FunctionClass<T extends AnyFunction> extends Function {
  (...args: Parameters<T>): ReturnType<T>;
}

export abstract class FunctionClass<T extends AnyFunction> extends Function {
  protected constructor(caller: (...args: Parameters<T>) => ReturnType<T>) {
    super();
    return new Proxy(this, {
      apply(target, _, args: Parameters<T>) {
        return caller.apply(this, args);
      },
    });
  }
}
