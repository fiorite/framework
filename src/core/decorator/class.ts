import { ClassDecorator2, DecoratorOuterFunction } from './function';
import { DecoratorWithPayload } from './with-payload';
import { Type } from '../type';

export interface ClassDecoratorWithPayload<TPayload, T = unknown> extends DecoratorWithPayload<TPayload, ClassDecorator2<T>> {
  (target: Type<T>): void;
}

export class ClassDecoratorWithPayload<TPayload, T> extends DecoratorWithPayload<TPayload, ClassDecorator2<T>> {
}

export function makeClassDecorator<TPayload, T = unknown>(
  decorator: DecoratorOuterFunction<ClassDecorator2<T>>,
  payload: TPayload,
  include: readonly ClassDecorator[] = [],
): ClassDecoratorWithPayload<TPayload, T> {
  return new ClassDecoratorWithPayload(decorator, payload, include);
}
