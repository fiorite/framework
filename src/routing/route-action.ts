import { HttpContext } from '../http';
import { DecoratorRecorder, FunctionClass, MaybePromiseLike, Type, ValueCallback } from '../core';
import { RouteResult } from './route-result';
import { ObjectMethodFactory, ServiceType } from '../di';
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
  private readonly _propertyKey: string | symbol;
  private readonly _objectMethodFactory: ObjectMethodFactory<unknown>;

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
    const methodFactory = new ObjectMethodFactory(type, propertyKey);
    super((context, next) => {
      const serviceProvider = context.provide!;
      serviceProvider.prototypeWhenMissing(type, (object: object) => {
        methodFactory(<R>(type2: ServiceType<R>, callback2: ValueCallback<R>) => {
          if (type2 === type) {
            return callback2(object as unknown as R);
          }

          return context.provide!(type2, callback2);
        }, next);
      });
    });

    this._type = type;
    this._propertyKey = propertyKey;
    this._objectMethodFactory = methodFactory;
  }
}