import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithData } from './with-data';

export interface MethodDecoratorWithData<TData> extends DecoratorWithData<TData, MethodDecorator> {
  (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void;
}

export class MethodDecoratorWithData<TData> extends DecoratorWithData<TData, MethodDecorator> {
}

export function makeMethodDecorator<TData>(
  decorator: DecoratorOuterFunction<MethodDecorator>,
  data: TData,
  include: readonly MethodDecorator[] = [],
): MethodDecoratorWithData<TData> {
  return new MethodDecoratorWithData(decorator, data, include);
}
