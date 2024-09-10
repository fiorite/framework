import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithPayload } from './payload';

export interface ParameterDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, ParameterDecorator> {
  (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void;
}

export class ParameterDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, ParameterDecorator> {
}

export function makeParameterDecorator<TPayload>(
  decorator: DecoratorOuterFunction<ParameterDecorator>,
  payload: TPayload,
  include: readonly ParameterDecorator[] = [],
): ParameterDecoratorWithPayload<TPayload> {
  return new ParameterDecoratorWithPayload(decorator, payload, include);
}
