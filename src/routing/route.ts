import { DecoratorRecorder, FunctionClass, Type, ValueCallback } from '../core';
import { Route, RoutePrefix } from './decorators';
import { ObjectMethodFactory, ServiceFactoryFunction, ServiceNotFoundError, ServiceType, TypeFactory } from '../di';
import { RouteDescriptor } from './route-descriptor';
import { RouteCallback } from './callback';

export class ObjectMethodCallback<T = unknown> extends FunctionClass<RouteCallback> {
  private readonly _typeFactory: TypeFactory<T>;
  private readonly _objectMethodFactory: ObjectMethodFactory<T>;

  constructor(
    type: Type,
    propertyKey: string | symbol,
  ) {
    const typeFactory = new TypeFactory<T>(type);
    const methodFactory = new ObjectMethodFactory(type, propertyKey);

    const reuseTypeFactory: ServiceFactoryFunction<T> = (provide, callback1) => {
      let provided = false;
      try {
        provide(type, object => {
          provided = true;
          callback1(object);
        });
      } catch (err) {
        if (!provided && err instanceof ServiceNotFoundError) {
          typeFactory(provide, callback1);
        } else {
          throw err;
        }
      }
    };

    super((context, next) => {
      reuseTypeFactory(context.provide!, object => {
        methodFactory(<R>(type2: ServiceType<R>, callback2: ValueCallback<R>) => {
          if (type2 === type) {
            return callback2(object as unknown as R);
          }

          return context.provide!(type2, callback2);
        }, next);
      });
    });

    this._typeFactory = typeFactory;
    this._objectMethodFactory = methodFactory;
  }
}

export class TypeRoutes implements Iterable<RouteDescriptor> {
  private readonly _array: readonly RouteDescriptor[] = [];

  constructor(type: Type) {
    const routePrefix = DecoratorRecorder.classSearch(RoutePrefix, type)
      .map(x => x.payload.path)
      .filter(x => !!x && x.trim().length)
      .reverse()
      .join('/');

    this._array = DecoratorRecorder.methodSearch(Route, type).map(methodRecord => {
      const { path, httpMethod } = methodRecord.payload;
      const routePath = '/' + ([routePrefix, path].filter(x => !!x && x.length).join('/'));
      return new RouteDescriptor({
        path: routePath,
        method: httpMethod,
        callback: new ObjectMethodCallback(type, methodRecord.path[1]),
      });
    });
  }

  // validateDependencies(provider: ServiceProvider): void {
  //   provider.validateDependencies(controllerType, methodRecord.path[1]);
  // }

  [Symbol.iterator](): Iterator<RouteDescriptor> {
    return this._array[Symbol.iterator]();
  }
}

