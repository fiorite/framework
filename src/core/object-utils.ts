/**
 * an issue that {@link FunctionClass} is typeof 'function' however, it is an object at the same time.
 * @param value
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && null !== value;
}

type ObjectWithMethod<K extends string | symbol> = { [P in K]: Function; }

/**
 * perhaps only null and undefined do not allow to request a property.
 * @param object
 */
export function isPropertyAccessible(object: unknown): object is Record<string|symbol, unknown> {
  return null !== object && undefined !== object;
}

/**
 * object is either primitive, function or object.
 * @param object
 * @param propertyKey
 */
export function isObjectMethod(object: unknown, propertyKey: string | symbol): object is ObjectWithMethod<typeof propertyKey> {
  return isPropertyAccessible(object) && typeof object[propertyKey] === 'function';
}
