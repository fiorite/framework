import { DecoratorOuterFunction } from './function-type';
import { DecoratorWithData } from './with-data';

export interface ClassDecoratorWithData<TData> extends DecoratorWithData<TData, ClassDecorator> {
  (target: Function): void;
}

export class ClassDecoratorWithData<TData> extends DecoratorWithData<TData, ClassDecorator> {
}

export function makeClassDecorator<TData>(
  decorator: DecoratorOuterFunction<ClassDecorator>,
  data: TData,
  include: readonly ClassDecorator[] = [],
): ClassDecoratorWithData<TData> {
  return new ClassDecoratorWithData(decorator, data, include);
}
