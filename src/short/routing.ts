import { HttpContext, HttpMethod } from '../http';
import { MapCallback } from '../core';
import { RouteCallback, RouteParams } from '../routing';
import { RoutesFeature } from '../app';

export function route(path: string, callback: RouteCallback): never;
export function route(method: HttpMethod | string, path: string, callback: RouteCallback): never;
export function route(...args: unknown[]): never {
  throw new Error('Not implemented.');
}

export function all(path: string, callback: RouteCallback): RoutesFeature {
  return route(path, callback);
}

export function get(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Get, path, callback);
}

export function head(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Head, path, callback);
}

export function post(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Post, path, callback);
}

export function put(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Put, path, callback);
}

/** delete is reserved */
export function del(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Delete, path, callback);
}

export function connect(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Connect, path, callback);
}

export function options(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Options, path, callback);
}

export function trace(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Trace, path, callback);
}

export function patch(path: string, callback: RouteCallback): never {
  return route(HttpMethod.Patch, path, callback);
}

export function param(ctx: HttpContext, key: string): string | number | boolean | undefined;
export function param<R>(ctx: HttpContext, key: string, callback: MapCallback<string | number | boolean | undefined, R>): R;
export function param<R>(ctx: HttpContext, callback: MapCallback<RouteParams, R>): R;
export function param(ctx: HttpContext, ...args: unknown[]) {
  const params = ctx.provide(RouteParams);

  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      return params.get(args[0]);
    }

    return (args[0] as MapCallback<RouteParams, unknown>)(params);
  }

  return (args[1] as MapCallback<string | number | boolean | undefined, unknown>)(params.get(args[0] as string));
}
