import { DecoratorRecorder, FunctionClass, MaybePromise, Type, VoidCallback } from '../core';
import { Controller, Route } from './decorator';
import { ServiceFactoryFunction, ServiceNotFoundError } from '../di';
import { RouteDescriptor } from './descriptor';
import { HttpCallback, HttpContext } from '../http';
import { _ServiceClassResolver, _ServiceMethodResolver, ServiceMethodResolveFunction } from '../di/_resolver';

export class ControllerRouteCallback extends FunctionClass<HttpCallback> {
  readonly controllerType: Type;
  readonly resolveType: ServiceFactoryFunction;
  readonly propertyKey: string | symbol;
  readonly resolveMethod: ServiceMethodResolveFunction<unknown, unknown>;
  readonly resultCallback: (context: HttpContext, err: unknown, result: unknown, next: VoidCallback) => void;

  constructor(object: {
    readonly controllerType: Type;
    readonly resolveType: ServiceFactoryFunction;
    readonly propertyKey: string | symbol;
    readonly resolveMethod: ServiceMethodResolveFunction<unknown, unknown>;
    readonly resultCallback: (context: HttpContext, err: unknown, result: unknown, next: VoidCallback) => void;
  }) {
    super((context, next) => {
      object.resolveType(context.provide, controllerObject => {
        object.resolveMethod(controllerObject, context.provide, resultMaybePromise => {
          MaybePromise.then(() => resultMaybePromise, result => {
            object.resultCallback(context, undefined, result, next);
          }, err => object.resultCallback(context, err, undefined, next));
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

export class ControllerRoutes implements Iterable<RouteDescriptor> {
  private readonly _array: readonly RouteDescriptor[] = [];

  constructor(
    controllerType: Type,
    resultCallback: (context: HttpContext, err: unknown | undefined, result: unknown | undefined, next: VoidCallback) => void
  ) {
    const routePrefix = DecoratorRecorder.classSearch(Controller, controllerType)
      .map(x => x.payload.routePrefix)
      .filter(x => !!x && x.trim().length)
      .reverse()
      .join('/');

    this._array = DecoratorRecorder.methodSearch(Route, controllerType).map(methodRecord => {
      // provider.validateDependencies(controllerType, methodRecord.path[1]);
      const methodServiceFactory = _ServiceMethodResolver.from(controllerType, methodRecord.path[1] as string | symbol);

      const { path, httpMethod } = methodRecord.payload;
      const routePath = '/' + ([routePrefix, path].filter(x => !!x && x.length).join('/'));

      // region lazy class instantiation pipeline, todo: refactor this

      let classResolver: _ServiceClassResolver<unknown>;
      const controllerServiceFactory: ServiceFactoryFunction = (provide, callback1) => {
        let canceled = false;
        try {
          provide(controllerType, controller => {
            canceled = true;
            callback1(controller);
          });
        } catch (err) {
          if (!canceled && err instanceof ServiceNotFoundError) {
            if (!classResolver) {
              classResolver = _ServiceClassResolver.from(controllerType);
            }
            classResolver(provide, callback1);
          } else {
            throw err;
          }
        }
      };

      // endregion

      const callback = new ControllerRouteCallback({
        controllerType,
        resolveType: controllerServiceFactory,
        propertyKey: methodRecord.path[1],
        resolveMethod: methodServiceFactory,
        resultCallback,
      });

      return new RouteDescriptor({ path: routePath, method: httpMethod, callback });
    });
  }

  // validateDependencies(provider: ServiceProvider): void {
  //   provider.validateDependencies(controllerType, methodRecord.path[1]);
  // }

  [Symbol.iterator](): Iterator<RouteDescriptor> {
    return this._array[Symbol.iterator]();
  }
}
