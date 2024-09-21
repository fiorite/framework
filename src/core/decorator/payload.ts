import { DecoratorFunction, DecoratorOuterFunction } from './function-type';
import { FunctionClass } from '../function';
import { DecoratorRecorder } from './recorder';
import { AnyCallback } from '../callback';

export abstract class DecoratorWithPayload<TPayload, TDecorator extends DecoratorFunction> extends FunctionClass<TDecorator> {
  private readonly _decorator: DecoratorOuterFunction<TDecorator>;

  get decorator(): DecoratorOuterFunction<TDecorator> {
    return this._decorator;
  }

  private readonly _payload: TPayload;

  get payload(): TPayload {
    return this._payload;
  }

  private _callers: DecoratorOuterFunction<TDecorator>[] = [];

  get callers(): readonly DecoratorOuterFunction<TDecorator>[] {
    return this._callers;
  }

  constructor(decorator: DecoratorOuterFunction<TDecorator>, payload: TPayload, include: readonly TDecorator[] = []) {
    super((
      (...args: any[]): any => {
        DecoratorRecorder.addEvent<TPayload, TDecorator, any[]>({path: args, decorator, payload: payload});
        include.forEach((otherDecorator: AnyCallback) => otherDecorator(...args));
      }
    ) as TDecorator);
    this._decorator = decorator;
    this._payload = payload;
  }

  calledBy(decorator: DecoratorOuterFunction<TDecorator>): this {
    this._callers.push(decorator);
    return this;
  }
}
