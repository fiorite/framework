import { DecoratorOuterFunction, MethodDecorator2 } from './typing';
import { DecoratorWithPayload } from './with-payload';

export interface MethodDecoratorWithPayload<TPayload, TFunction = (...args: any[]) => any> extends DecoratorWithPayload<TPayload, MethodDecorator2<TFunction>> {
  (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<TFunction>): void;
}

export class MethodDecoratorWithPayload<TPayload, TFunction = (...args: any[]) => any> extends DecoratorWithPayload<TPayload, MethodDecorator2<TFunction>> {
}

export function makeMethodDecorator<TPayload, TFunction = (...args: any[]) => any>(
  decorator: DecoratorOuterFunction<MethodDecorator2<TFunction>>,
  payload: TPayload,
  include: readonly MethodDecorator[] = [],
): MethodDecoratorWithPayload<TPayload, TFunction> {
  return new MethodDecoratorWithPayload(decorator, payload, include);
}
