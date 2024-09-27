import { DecoratorOuterFunction } from './function';
import { DecoratorWithPayload } from './with-payload';

export interface PropertyDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, PropertyDecorator> {
  (target: Object, propertyKey: string | symbol): void;
}

export class PropertyDecoratorWithPayload<TPayload> extends DecoratorWithPayload<TPayload, PropertyDecorator> {
}

export function makePropertyDecorator<TPayload>(
  decorator: DecoratorOuterFunction<PropertyDecorator>,
  payload: TPayload,
  include: readonly PropertyDecorator[] = [],
): PropertyDecoratorWithPayload<TPayload> {
  return new PropertyDecoratorWithPayload(decorator, payload, include);
}
