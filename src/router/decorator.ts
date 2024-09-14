import { Provide, Service } from '../service';
import type { IncomingMessage } from 'http';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeMethodDecorator,
  MapCallback,
  MaybePromise,
  MethodDecoratorWithPayload
} from '../core';
import { HttpContext, HttpMethod } from '../http';

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
  return makeClassDecorator(Controller, new ControllerPayload(routePrefix), [Service().calledBy(Controller)]);
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

export const FromRequest = <R, TRequest extends IncomingMessage>(callback: MapCallback<TRequest, MaybePromise<R>>) => {
  // noinspection UnnecessaryLocalVariableJS for some reason it throws error in IDE on regular return. todo: revise
  const d = Provide(HttpContext, context => callback(context.request)).calledBy(FromRequest);
  return d;
};

export const FromParam = <R = unknown>(paramName: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  // noinspection UnnecessaryLocalVariableJS for some reason it throws error in IDE on regular return. todo: revise
  const d = FromRequest(request => {
    const queryValue = (request as any).params[paramName] as string | undefined;
    return callback!(queryValue);
  }).calledBy(FromParam);
  return d;
};

export const FromQuery = <R = unknown>(queryKey: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  // noinspection UnnecessaryLocalVariableJS for some reason it throws error in IDE on regular return. todo: revise
  const d = FromRequest(request => {
    const queryValue = (request as any).query[queryKey] as string | undefined;
    return callback!(queryValue);
  }).calledBy(FromQuery);
  return d;
};

export const FromBody = <T = unknown, R = unknown>(callback?: MapCallback<T, MaybePromise<R>>) => {
  if (!callback) {
    callback = ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }

  // noinspection UnnecessaryLocalVariableJS for some reason it throws error in IDE on regular return. todo: revise
  const d = FromRequest(request => callback!((request as any).body as T));
  return d;
};
