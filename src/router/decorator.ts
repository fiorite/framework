import { Inherited, Provide } from '../service';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeMethodDecorator,
  MapCallback,
  MaybePromise,
  MethodDecoratorWithPayload
} from '../core';
import { HttpContext, HttpMethod, HttpRequest } from '../http';

export class ControllerPayload {
  private readonly _routePrefix?: string;

  get routePrefix(): string | undefined {
    return this._routePrefix;
  }

  constructor(routePrefix?: string) {
    this._routePrefix = routePrefix;
  }
}

export function Controller<T>(routePrefix?: string): ClassDecoratorWithPayload<ControllerPayload, T> {
  return makeClassDecorator(Controller, new ControllerPayload(routePrefix), [Inherited().calledBy(Controller)]);
}

export const RoutePrefix = (path: string) => Controller(path).calledBy(RoutePrefix);

export class RoutePayload {
  private readonly _path?: string;

  get path(): string | undefined {
    return this._path;
  }

  private readonly _httpMethod?: HttpMethod | string;

  get httpMethod(): HttpMethod | string | undefined {
    return this._httpMethod;
  }

  constructor(path?: string, httpMethod?: HttpMethod | string) {
    this._path = path;
    this._httpMethod = httpMethod;
  }
}

export function Route(path?: string, httpMethod?: HttpMethod | string): MethodDecoratorWithPayload<RoutePayload> {
  return makeMethodDecorator(Route, new RoutePayload(path, httpMethod));
}

export const HttpGet = (path?: string) => {
  return Route(path, HttpMethod.Get).calledBy(HttpGet);
};

export const HttpHead = (path?: string) => {
  return Route(path, HttpMethod.Head).calledBy(HttpHead);
};

export const HttpPost = (path?: string) => {
  return Route(path, HttpMethod.Post).calledBy(HttpPost);
};

export const HttpPut = (path?: string) => {
  return Route(path, HttpMethod.Put).calledBy(HttpPut);
};

export const HttpDelete = (path?: string) => {
  return Route(path, HttpMethod.Delete).calledBy(HttpDelete);
};

export const HttpConnect = (path?: string) => {
  return Route(path, HttpMethod.Connect).calledBy(HttpConnect);
};

export const HttpOptions = (path?: string) => {
  return Route(path, HttpMethod.Options).calledBy(HttpOptions);
};

export const HttpTrace = (path?: string) => {
  return Route(path, HttpMethod.Trace).calledBy(HttpTrace);
};

export const HttpPatch = (path?: string) => {
  return Route(path, HttpMethod.Patch).calledBy(HttpPatch);
};

export const FromRequest = (callback: MapCallback<HttpRequest, MaybePromise<unknown>>) => {
  return Provide(HttpContext, context => callback(context.request)).calledBy(FromRequest);
};

export const FromParam = (paramName: string, callback?: MapCallback<string | number | boolean | undefined, MaybePromise<unknown>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | number | boolean | undefined, MaybePromise<unknown>>;
  }

  return FromRequest(request => callback!(request.params.get(paramName))).calledBy(FromParam);
};

export const FromQuery = (queryKey: string, callback?: MapCallback<string | undefined, MaybePromise<unknown>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | string[] | undefined, MaybePromise<unknown>>;
  }

  return FromRequest(request => callback!(request.query.get(queryKey))).calledBy(FromQuery);
};

export const FromHeader = (headerName: string, callback?: MapCallback<string | string[] | number | undefined, MaybePromise<unknown>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | string[] | number | undefined, MaybePromise<unknown>>;
  }

  return FromRequest(request => callback!(request.headers.get(headerName))).calledBy(FromQuery);
};

export const FromBody = <T = unknown, R = unknown>(callback?: MapCallback<T, MaybePromise<R>>) => {
  if (!callback) {
    callback = ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }

  return FromRequest(request => callback!((request as any).body as T));
};
