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

export function Controller(routePrefix?: string): ClassDecoratorWithPayload<ControllerPayload> {
  return makeClassDecorator(Controller, new ControllerPayload(routePrefix), [Service()]);
}

export const RoutePrefix = (path: string) => Controller(path);

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

export const HttpGet = (path?: string) => Route(path, HttpMethod.Get);

export const HttpHead = (path?: string) => Route(path, HttpMethod.Head);

export const HttpPost = (path?: string) => Route(path, HttpMethod.Post);

export const HttpPut = (path?: string) => Route(path, HttpMethod.Put);

export const HttpDelete = (path?: string) => Route(path, HttpMethod.Delete);

export const HttpConnect = (path?: string) => Route(path, HttpMethod.Connect);

export const HttpOptions = (path?: string) => Route(path, HttpMethod.Options);

export const HttpTrace = (path?: string) => Route(path, HttpMethod.Trace);

export const HttpPatch = (path?: string) => Route(path, HttpMethod.Patch);

export const FromRequest = <R, TRequest extends IncomingMessage>(callback: MapCallback<TRequest, MaybePromise<R>>) => {
  return Provide(HttpContext, context => callback(context.request));
};

export const FromParam = <R = unknown>(paramName: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  return FromRequest(request => {
    const queryValue = (request as any).params[paramName] as string | undefined;
    return callback!(queryValue);
  });
};

export const FromQuery = <R = unknown>(queryKey: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  return FromRequest(request => {
    const queryValue = (request as any).query[queryKey] as string | undefined;
    return callback!(queryValue);
  });
};

export const FromBody = <T = unknown, R = unknown>(callback?: MapCallback<T, MaybePromise<R>>) => {
  if (!callback) {
    callback = ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }

  return FromRequest(request => callback!((request as any).body as T));
};
