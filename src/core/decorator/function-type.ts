import { Type } from '../type';

export interface ClassDecorator2<T = any> {
  (target: Type<T>): void;
}

export type DecoratorFunction = ClassDecorator | ClassDecorator2 | PropertyDecorator | MethodDecorator | ParameterDecorator;

export type DecoratorOuterFunction<R extends DecoratorFunction = DecoratorFunction> = (...args: any[]) => R;
