import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithData } from './with-data';

export interface ParameterDecoratorWithData<TData> extends DecoratorWithData<TData, ParameterDecorator> {
  (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void;
}

export class ParameterDecoratorWithData<TData> extends DecoratorWithData<TData, ParameterDecorator> {
}

export function makeParameterDecorator<TData>(
  decorator: DecoratorOuterFunction<ParameterDecorator>,
  data: TData,
  include: readonly ParameterDecorator[] = [],
): ParameterDecoratorWithData<TData> {
  return new ParameterDecoratorWithData(decorator, data, include);
}
