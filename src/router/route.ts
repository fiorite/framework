import { DecoratorRecorder, MaybePromise, Type, ValueCallback } from '../core';
import { Controller, Route } from './decorator';
import { ServiceProvider } from '../di';
import { RouteDeclaration } from './declaration';
import { HttpContext } from '../http';

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

    return new RouteDeclaration({
      path: routePath,
      method: httpMethod,
      callback: context => {
        controllerServiceFactory(context.provide, controllerInstance => {
          methodServiceFactory(controllerInstance, context.provide, resultMaybePromise => {
            MaybePromise.then(() => resultMaybePromise, result => {
              resultCallback(context, undefined, result);
            }, err => resultCallback(context, err));
          });
        });
      }
    });
  });
}
