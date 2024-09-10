export type DecoratorFunction = ClassDecorator | PropertyDecorator | MethodDecorator | ParameterDecorator;

export type DecoratorOuterFunction<R extends DecoratorFunction = DecoratorFunction> = (...args: any[]) => R;
