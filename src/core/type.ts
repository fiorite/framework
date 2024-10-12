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
