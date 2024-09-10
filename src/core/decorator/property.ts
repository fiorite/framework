import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithData } from './with-data';

export interface PropertyDecoratorWithData<TData> extends DecoratorWithData<TData, PropertyDecorator> {
  (target: Object, propertyKey: string | symbol): void;
}

export class PropertyDecoratorWithData<TData> extends DecoratorWithData<TData, PropertyDecorator> {
}

export function makePropertyDecorator<TData>(
  decorator: DecoratorOuterFunction<PropertyDecorator>,
  data: TData,
  include: readonly PropertyDecorator[] = [],
): PropertyDecoratorWithData<TData> {
  return new PropertyDecoratorWithData(decorator, data, include);
}
