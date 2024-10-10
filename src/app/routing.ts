import { ResultHandleCallback, RouteMatcher, RouteParams, RoutingMiddleware } from '../routing';
import { HttpPipeline } from '../http';
import { ApplicationConfigureFunction } from './application';

export function featureRouting(handleResult: ResultHandleCallback = (_context, _value, next) => next()): ApplicationConfigureFunction {
  return provider => {
    const routeMatcher = new RouteMatcher([]);
    const middleware = new RoutingMiddleware(routeMatcher, handleResult);

    provider.addScoped(RouteParams)
      .addValue(RouteMatcher, routeMatcher)
      .addValue(RoutingMiddleware, middleware);

    provider(HttpPipeline).add(middleware);
  };
}
