export function isObject(value: unknown): value is object {
  return typeof value === 'object' && null !== value;
}

type ObjectWithMethod<K extends string | symbol> = { [P in K]: Function; }

export function isObjectMethod(object: unknown, propertyKey: string | symbol): object is ObjectWithMethod<typeof propertyKey> {
  return isObject(object) && propertyKey in object && typeof (object as any)[propertyKey] === 'function';
}
