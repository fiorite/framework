import { Type, ValueCallback } from '../core';

export type TransformCallback<T, R> = (value: T, done: ValueCallback<R>) => void;

export class TypeTransformer<T = unknown, R = unknown> {
  private readonly _type: Type<T>;

  get type(): Type<T> {
    return this._type;
  }

  private readonly _transform: TransformCallback<T, R>;

  get transform(): TransformCallback<T, R> {
    return this._transform;
  }

  constructor(type: Type<T>, transform: TransformCallback<T, R>) {
    this._type = type;
    this._transform = transform;
  }
}

export function makeTransformer<T, R>(type: Type<T>, transform: TransformCallback<T, R>): TypeTransformer {
  return new TypeTransformer(type, transform) as TypeTransformer;
}
