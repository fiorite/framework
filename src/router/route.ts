import { _DecoratorRecorder, MaybePromise, Type } from '../core';
import { Controller, Route } from './decorator';
import { ServiceFactoryFunction, ServiceProvider } from '../service';
import { HttpMethod } from '../http';

export interface RouteDeclaration {
  readonly controllerType: Type;
  readonly propertyKey: string | symbol;
  readonly routePath: string;
  readonly httpMethod?: HttpMethod | string;
  readonly routeCaller: ServiceFactoryFunction<unknown>;
}

export function makeControllerRouter(controllerType: Type, initialProvider: ServiceProvider): readonly RouteDeclaration[] {
  const routePrefix = _DecoratorRecorder.classSearch(Controller, controllerType)
    .map(x => x.payload.routePrefix)
    .filter(x => !!x && x.trim().length)
    .reverse()
    .join('/');

  return _DecoratorRecorder.methodSearch(Route, controllerType).map(methodRecord => {
    initialProvider.validateDependencies(controllerType, methodRecord.path[1]);
    const methodServiceFactory = initialProvider.prepareMethodFactory(controllerType, methodRecord.path[1]);

    const {path, httpMethod} = methodRecord.payload;
    const routePath = '/' + ([routePrefix, path].filter(x => !!x && x.length).join('/'));
    const controllerServiceFactory = initialProvider.prepareTypeFactory(controllerType);

    return {
      controllerType,
      propertyKey: methodRecord.path[1],
      routePath,
      httpMethod,
      routeCaller: (routeProvider, callback) => {
        controllerServiceFactory(routeProvider, controllerInstance => {
          methodServiceFactory(controllerInstance, routeProvider, resultMaybePromise => {
            MaybePromise.then(() => resultMaybePromise, callback);
          });
        });
      },
    };
  });
}
