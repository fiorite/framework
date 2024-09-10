import { DecoratorFunction, DecoratorOuterFunction } from './function-type';
import { AnyFunction, FunctionClass } from '../function';
import { DecoratorRecorder } from './recorder';

export abstract class DecoratorWithData<TData, TDecorator extends DecoratorFunction = DecoratorFunction> extends FunctionClass<TDecorator> {
  private readonly _decorator: DecoratorOuterFunction<TDecorator>;

  get decorator(): DecoratorOuterFunction<TDecorator> {
    return this._decorator;
  }

  private readonly _data: TData;

  get data(): TData {
    return this._data;
  }

  constructor(decorator: DecoratorOuterFunction<TDecorator>, data: TData, include: readonly TDecorator[] = []) {
    super((...args: any[]): any => {
      DecoratorRecorder.addRecord<TData, TDecorator, any[]>({ path: args, decorator, data });
      include.forEach((otherDecorator: AnyFunction) => otherDecorator(...args));
    });
    this._decorator = decorator;
    this._data = data;
  }
}
