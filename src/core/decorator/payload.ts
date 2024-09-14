import { DecoratorFunction, DecoratorOuterFunction } from './function-type';
import { AnyFunction, FunctionClass } from '../function';
import { _DecoratorRecorder } from './recorder';

export abstract class DecoratorWithPayload<TPayload, TDecorator extends DecoratorFunction> extends FunctionClass<TDecorator> {
  private readonly _decorator: DecoratorOuterFunction<TDecorator>;

  get decorator(): DecoratorOuterFunction<TDecorator> {
    return this._decorator;
  }

  private readonly _payload: TPayload;

  get payload(): TPayload {
    return this._payload;
  }

  constructor(decorator: DecoratorOuterFunction<TDecorator>, payload: TPayload, include: readonly TDecorator[] = []) {
    super((...args: any[]): any => {
      _DecoratorRecorder.addEvent<TPayload, TDecorator, any[]>({path: args, decorator, payload: payload});
      include.forEach((otherDecorator: AnyFunction) => otherDecorator(...args));
    });
    this._decorator = decorator;
    this._payload = payload;
  }
}
