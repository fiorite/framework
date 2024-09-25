import { FunctionClass, MaybePromise } from '../core';
import { HttpCallback } from '../http';
import { RouteMatcher } from './matcher';
import { RouteParams } from './params';
import { Logger } from '../logging';

export class RoutingMiddleware extends FunctionClass<HttpCallback> {
  constructor(routeMatcher: RouteMatcher) {
    super((context, next) => {
      const result = routeMatcher.match(context.request);
      if (undefined !== result && result.data.length) {
        const params = context.provide(RouteParams);

        params.clear();
        Object.entries(result.params).forEach((x) => params.set(x[0], x[1] as any));

        const length = result.data[0] instanceof FunctionClass ?
          result.data[0][FunctionClass.callback].length :
          result.data[0].length;

        if (length < 2) {
          // next is not bound to route callback.
          const logger = context.provide(Logger);
          logger.warn('next is not added to main callback, auto-close after sync or promise will be applied');
        }

        MaybePromise.then(() => { // todo: maybe allow all the matched handlers (middleware as part of routing?)
          return result.data[0](context, next);
        }, () => {
          if (length < 2) {
            next();
          }
        }, err => {
          throw err;
        });
      } else {
        next();
      }
    });
  }
}
