import { FunctionClass } from '../core';
import { HttpMiddleware, HttpStatusCode } from '../http';
import { RouteMatcher } from './matcher';

export class RoutingMiddleware extends FunctionClass<HttpMiddleware> {
  constructor(routeMatcher: RouteMatcher) {
    super((context) => {
      const { request, response } = context;
      const result = routeMatcher.match(context.request);
      if (undefined !== result && result.data.length) {
        request.params.clear();
        Object.entries(result.params).forEach((x) => request.params.set(x[0], x[1] as any));
        result.data[0](context);
      } else {
        response.statusCode = HttpStatusCode.NotFound;
        response.close();
        // next(); // or 404
      }
    });
  }
}
