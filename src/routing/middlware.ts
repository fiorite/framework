import { FunctionClass, MaybePromiseLike, VoidCallback } from '../core';
import { HttpCallback, HttpContext } from '../http';
import { RouteMatcher } from './route-matcher';
import { RouteParams } from './route-params';
import { Logger } from '../logging';

export type ResultHandleCallback<T = unknown> = (context: HttpContext, result: T, next: VoidCallback) => void;

export class RoutingMiddleware extends FunctionClass<HttpCallback> {
  constructor(routeMatcher: RouteMatcher, onResult: ResultHandleCallback) {
    super((context, next) => {
      let responded = false;
      for (const result of routeMatcher.match(context.request.url!.pathname)) {
        if (!result.descriptor.method || result.descriptor.method === context.request.method) {
          if (responded) {
            throw new Error('multiple routes is not supported rn');
          }

          const params = context.provide!(RouteParams);

          params.clear();
          Object.entries(result.params).forEach((x) => params.set(x[0], x[1] as any));

          const length = result.descriptor.callback.length;

          if (length < 2) {
            // next is not bound to route callback.
            const logger = context.provide!(Logger);
            logger.info('next is not added to main callback, auto-close after sync or promise will be applied');
          }

          const localNext = (result: unknown) => onResult(context, result, next);

          MaybePromiseLike.then(() => { // todo: maybe allow all the matched handlers (middleware as part of routing?)
            return result.descriptor.callback(context, localNext);
          }, result => {
            if (length < 2) {
              localNext(result);
            }
          }, err => {
            throw err;
          });
          responded = true;
        }
      }
      if (!responded) {
        next();
      }
    });
  }
}
