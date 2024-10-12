import { Type } from '../type';

export interface ClassDecorator2<T = any> {
  (target: Type<T>): void;
}

export interface MethodDecorator2<T = any> {
  (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): void
}

export type DecoratorFunction = ClassDecorator | ClassDecorator2 | PropertyDecorator | MethodDecorator | MethodDecorator2 | ParameterDecorator;

export type DecoratorOuterFunction<R extends DecoratorFunction = DecoratorFunction> = (...args: any[]) => R;
