import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithPayload } from './with-payload';

export interface ClassDecoratorWithPayload<TData> extends DecoratorWithPayload<TData, ClassDecorator> {
  (target: Function): void;
}

export class ClassDecoratorWithPayload<TData> extends DecoratorWithPayload<TData, ClassDecorator> {
}

export function makeClassDecorator<TPayload>(
  decorator: DecoratorOuterFunction<ClassDecorator>,
  payload: TPayload,
  include: readonly ClassDecorator[] = [],
): ClassDecoratorWithPayload<TPayload> {
  return new ClassDecoratorWithPayload(decorator, payload, include);
}
