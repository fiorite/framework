import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithPayload } from './payload';

export interface ClassDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, ClassDecorator> {
  (target: Function): void;
}

export class ClassDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, ClassDecorator> {
}

export function makeClassDecorator<TPayload>(
  decorator: DecoratorOuterFunction<ClassDecorator>,
  payload: TPayload,
  include: readonly ClassDecorator[] = [],
): ClassDecoratorWithPayload<TPayload> {
  return new ClassDecoratorWithPayload(decorator, payload, include);
}
