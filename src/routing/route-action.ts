import { HttpContext } from '../http';
import { DecoratorRecorder, FunctionClass, MaybePromiseLike, Type, ValueCallback } from '../core';
import { RouteResult } from './route-result';
import { Provide } from '../di';
import { RouteDescriptor } from './route-descriptor';
import { Route, RoutePrefix } from './decorators';

export type RouteActionCallback = (context: HttpContext, done: ValueCallback<RouteResult | unknown>) => void;

export interface RouteActionFunction extends RouteActionCallback {
  (context: HttpContext): MaybePromiseLike<RouteResult | unknown>;
}

export namespace RouteActionFunction {
  export function toCallback(action: RouteActionFunction): RouteActionCallback {
    return action.length > 1 ? action : (context, next) => {
      MaybePromiseLike.then(() => action(context), next);
    };
  }
}

export class ReflectedAction extends FunctionClass<RouteActionCallback> {
  private readonly _type: Type;

  get type(): Type {
    return this._type;
  }

  private readonly _propertyKey: string | symbol;

  get propertyKey(): string | symbol {
    return this._propertyKey;
  }

  // private readonly _objectMethodFactory: ObjectMethodFactory<unknown>;

  static forType(value: Type): RouteDescriptor[] {
    const prefix = RoutePrefix.join(value);
    return DecoratorRecorder.methodSearch(Route, value).map(decoratorRecord => {
      const { path, httpMethod } = decoratorRecord.payload;
      const absolute = '/' + ([prefix, path].filter(x => !!x && x.length).join('/'));
      const action = new ReflectedAction(value, decoratorRecord.path[1]);
      return new RouteDescriptor(absolute, action as unknown as RouteActionFunction, httpMethod);
    });
  }

  constructor(type: Type, propertyKey: string | symbol) {
    const target = Provide.targetAssemble(type, propertyKey);
    super((context, next) => {
      context.provider.prototypeWhenMissing(type, (object: object) => {
        context.provider.all(target.dependencies, args => {
          target(args, args2 => {
            MaybePromiseLike.then(() => (object as any)[propertyKey](...args2), next);
          });
        });
      });
    });

    this._type = type;
    this._propertyKey = propertyKey;
    // this._objectMethodFactory = methodFactory;
  }
}
