import { FunctionClass, VoidCallback } from '../core';
import { HttpCallback, HttpContext, HttpResponseHeader } from '../http';
import { RouteMatcher } from './route-matcher';
import { RouteParams } from './route-params';
import { TransferNormalizer } from '../data';
import { RouteResult } from './route-result';
import { RouteActionFunction } from './route-action';

export type ResultHandleCallback<T = unknown> = (context: HttpContext, result: T, next: VoidCallback) => void;

export class RoutingMiddleware extends FunctionClass<HttpCallback> {
  constructor(routeMatcher: RouteMatcher, normalizer: TransferNormalizer) {
    super((context, next) => {
      let responded = false;
      for (const result of routeMatcher.match(context.request.url!.pathname)) {
        if (!result.descriptor.httpMethod || result.descriptor.httpMethod === context.request.method) {
          if (responded) {
            throw new Error('multiple routes is not supported rn');
          }

          // setup params
          const params = context.provide!(RouteParams);
          params.clear();
          Object.entries(result.params).forEach((x) => params.set(x[0], x[1] as any));

          // perform action
          const response = context.response;
          const handleResult = (result: unknown): void => {
            if (result instanceof RouteResult) {
              return result.write(response, result2 => undefined === result2 ? next() : handleResult(result2));
            }

            normalizer.normalize(result, normalized => { // write JSON
              const jsonString = JSON.stringify(normalized);
              response.headers.set(HttpResponseHeader.ContentType, 'application/json; charset=utf-8');
              response.headers.set(HttpResponseHeader.ContentLength, Number(jsonString.length));

              response.write(jsonString, () => {
                response.close();
                next();
              });
            });
          };

          RouteActionFunction.toCallback(result.descriptor.action)(context, result => {
            if (response.headersSent) {
              return next(); // action has started writing.
            }

            handleResult(result);
          });
        }
      }
      if (!responded) {
        next();
      }
    });
  }
}
