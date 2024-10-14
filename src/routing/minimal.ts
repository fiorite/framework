import { HttpContext } from '../http';
import { MapCallback } from '../core';
import { RouteParams } from './route-params';

export function param(context: HttpContext, key: string): string | number | boolean | undefined;
export function param<R>(context: HttpContext, key: string, callback: MapCallback<string | number | boolean | undefined, R>): R;
export function param<R>(context: HttpContext, callback: MapCallback<RouteParams, R>): R;
export function param(context: HttpContext, ...args: unknown[]) {
  const params = context.provide!(RouteParams);

  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      return params.get(args[0]);
    }

    return (args[0] as MapCallback<RouteParams, unknown>)(params);
  }

  return (args[1] as MapCallback<string | number | boolean | undefined, unknown>)(params.get(args[0] as string));
}
