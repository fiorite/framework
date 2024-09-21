import { DecoratorRecorder, FunctionClass, MaybePromise, Type, ValueCallback } from '../core';
import { Controller, Route } from './decorator';
import { ServiceFactoryFunction, ServiceProvider } from '../di';
import { RouteDeclaration } from './route-declaration';
import { HttpCallback, HttpContext } from '../http';
import { ServiceMethodResolveFunction } from '../di/_resolver';

export class ControllerRouteCallback extends FunctionClass<HttpCallback> {
  readonly controllerType: Type;
  readonly resolveType: ServiceFactoryFunction;
  readonly propertyKey: string | symbol;
  readonly resolveMethod: ServiceMethodResolveFunction<unknown, unknown>;
  readonly resultCallback: (context: HttpContext, err?: unknown, result?: unknown) => void;

  constructor(object: {
    readonly controllerType: Type;
    readonly resolveType: ServiceFactoryFunction;
    readonly propertyKey: string | symbol;
    readonly resolveMethod: ServiceMethodResolveFunction<unknown, unknown>;
    readonly resultCallback: (context: HttpContext, err?: unknown, result?: unknown) => void;
  }) {
    super(context => {
      object.resolveType(context.provide, controllerObject => {
        object.resolveMethod(controllerObject, context.provide, resultMaybePromise => {
          MaybePromise.then(() => resultMaybePromise, result => {
            object.resultCallback(context, undefined, result);
          }, err => object.resultCallback(context, err));
        });
      });
    });
    this.controllerType = object.controllerType;
    this.resolveType = object.resolveType;
    this.propertyKey = object.propertyKey;
    this.resolveMethod = object.resolveMethod;
    this.resultCallback = object.resultCallback;
  }
}

export function makeControllerRouter(
  controllerType: Type,
  provider: ServiceProvider,
  resultCallback: (context: HttpContext, err?: unknown, result?: unknown) => void
): readonly RouteDeclaration[] {
  const routePrefix = DecoratorRecorder.classSearch(Controller, controllerType)
    .map(x => x.payload.routePrefix)
    .filter(x => !!x && x.trim().length)
    .reverse()
    .join('/');

  return DecoratorRecorder.methodSearch(Route, controllerType).map(methodRecord => {
    provider.validateDependencies(controllerType, methodRecord.path[1]);
    const methodServiceFactory = provider.prepareMethodFactory(controllerType, methodRecord.path[1]);

    const { path, httpMethod } = methodRecord.payload;
    const routePath = '/' + ([routePrefix, path].filter(x => !!x && x.length).join('/'));
    const controllerServiceFactory = provider.prepareTypeFactory(controllerType);

    const callback = new ControllerRouteCallback({
      controllerType,
      resolveType: controllerServiceFactory,
      propertyKey: methodRecord.path[1],
      resolveMethod: methodServiceFactory,
      resultCallback,
    });

    return new RouteDeclaration({ path: routePath, method: httpMethod, callback });
  });
}
