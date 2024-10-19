/**
 * Any type. Unlike {@link Type} not necessary constructable.
 */
export interface AbstractType<T = unknown> extends Function {
  prototype: T;
}

/**
 * Constructable type.
 */
export interface Type<T = any> extends AbstractType<T> {
  new(...args: any[]): T;
}

/**
 * Check if object is constructable.
 */
export function isType<T>(object: unknown): object is Type<T> {
  return typeof object === 'function' && !!object.prototype && !!object.prototype.constructor;
}

/**
 * Check if object is constructable.
 */
export function isInstance<T>(object: unknown): object is T {
  return null !== object && undefined !== object && Function !== object.constructor;
}

export class TypeTold<T, TValue> {
  private readonly _type: T;

  get type(): T {
    return this._type;
  }

  private readonly _value: TValue;

  get value(): TValue {
    return this._value;
  }

  constructor(type: T, value: TValue) {
    this._type = type;
    this._value = value;
  }
}

export function tellType<T, TValue>(type: T, value: TValue): TypeTold<T, TValue> {
  return new TypeTold<T, TValue>(type, value);
}

export type MaybeTypeTold<T, TValue> = TValue | TypeTold<T, TValue>;

export namespace MaybeTypeTold {
  export function spread<T, TValue>(object: MaybeTypeTold<T, TValue>): [value: TValue, type: T | undefined] {
    return object instanceof TypeTold ? [object.value, object.type] : [object, undefined];
  }
}
