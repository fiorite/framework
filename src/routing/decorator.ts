import { Inherited, Provide, ProvideDecorator } from '../di';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeMethodDecorator,
  MapCallback,
  MaybePromise,
  MethodDecoratorWithPayload
} from '../core';
import { HttpMethod } from '../http';
import { RouteParams } from './params';

export class ControllerPayload {
  private readonly _routePrefix?: string;

  get routePrefix(): string | undefined {
    return this._routePrefix;
  }

  constructor(routePrefix?: string) {
    this._routePrefix = routePrefix;
  }
}

/** @deprecated was thinking of removing it and having specific ones, like {@link RoutePrefix} */
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

export function Route(path?: string, method?: HttpMethod | string): MethodDecoratorWithPayload<RoutePayload> {
  return makeMethodDecorator(Route, new RoutePayload(path, method));
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

export function FromParam(key: string): ProvideDecorator<RouteParams, string | number | boolean | undefined>;
export function FromParam<R>(key: string, callback: MapCallback<string | number | boolean | undefined, MaybePromise<R>>): ProvideDecorator<RouteParams, MaybePromise<R>>;
export function FromParam<R>(callback: MapCallback<RouteParams, R>): ProvideDecorator<RouteParams, MaybePromise<R>>;
export function FromParam(...args: unknown[]) {
  let callback: MapCallback<RouteParams, unknown>;
  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      callback = params => params.get(args[0] as string);
    } else {
      callback = args[0] as MapCallback<RouteParams, unknown>;
    }
  } else {
    callback = params => {
      const value = params.get(args[0] as string);
      return (args[1] as MapCallback<string | number | boolean | undefined, unknown>)(value);
    };
  }

  return Provide(RouteParams, callback).calledBy(FromParam);
}
