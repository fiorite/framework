import { Context, MapCallback } from '../core';
import { RouteParams } from './route-params';
import { provide } from '../di';

export function param(context: Context, key: string): string | number | boolean | undefined;
export function param<R>(context: Context, key: string, callback: MapCallback<string | number | boolean | undefined, R>): R;
export function param<R>(context: Context, callback: MapCallback<RouteParams, R>): R;
export function param(context: Context, ...args: unknown[]) {
  const params = provide(context, RouteParams);

  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      return params.get(args[0]);
    }

    return (args[0] as MapCallback<RouteParams, unknown>)(params);
  }

  return (args[1] as MapCallback<string | number | boolean | undefined, unknown>)(params.get(args[0] as string));
}
