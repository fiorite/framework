import { DecoratorOuterFunction } from './typing';
import { DecoratorWithPayload } from './with-payload';

export interface MethodDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, MethodDecorator> {
  (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void;
}

export class MethodDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, MethodDecorator> {
}

export function makeMethodDecorator<TPayload>(
  decorator: DecoratorOuterFunction<MethodDecorator>,
  payload: TPayload,
  include: readonly MethodDecorator[] = [],
): MethodDecoratorWithPayload<TPayload> {
  return new MethodDecoratorWithPayload(decorator, payload, include);
}
