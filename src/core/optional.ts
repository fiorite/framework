import { FunctionClass } from './function-class';

/**
 * Instance used to mark something as an optional type and value. e.g. ServiceType.
 */
export class OptionalMarker<T> {
  private readonly _value: T;

  get value(): T {
    return this._value;
  }

  constructor(value: T) {
    this._value = value;
  }
}

export type MaybeOptional<T> = T | OptionalMarker<T>;

export namespace MaybeOptional {
  export function spread<T>(object: MaybeOptional<T>): [T, optional: boolean] {
    return object instanceof OptionalMarker ? [object.value, true] : [object, false];
  }
}

export interface OptionalModifier {
  <T>(value: T): OptionalMarker<T>;
}

/**
 * Use `optional` variable from `fiorite` which is the only instance of {@link OptionalModifier}.
 */
export class OptionalModifier extends FunctionClass<(<T>(value: T) => OptionalMarker<T>)> {
  private static _instance = new OptionalModifier();

  static get instance(): OptionalModifier {
    return this._instance;
  }

  private constructor() {
    super(<T>(value: T) => new OptionalMarker<T>(value));
  }
}

export const optional = OptionalModifier.instance;
