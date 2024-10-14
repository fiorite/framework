import { ServiceConfigureFunction, ServiceProvider } from '../di';
import { RouteMatcher } from './route-matcher';
import { makeTransformer, TransferNormalizer, TransformCallback } from '../data';
import { RoutingMiddleware } from './middlware';
import { RouteParams } from './route-params';
import { HttpPipeline } from '../http';
import { Type } from '../core';

export function addRouting(provider: ServiceProvider): void {
  const routeMatcher = new RouteMatcher([]);
  const normalizer = new TransferNormalizer([]);
  const middleware = new RoutingMiddleware(routeMatcher, normalizer);

  provider.addScoped(RouteParams)
    .addValue(TransferNormalizer, normalizer)
    .addValue(RouteMatcher, routeMatcher)
    .addValue(RoutingMiddleware, middleware);

  provider(HttpPipeline).add(middleware);
}

export function addNormalizer<T, R>(type: Type<T>, normalize: TransformCallback<T, R>): ServiceConfigureFunction {
  return provide => provide(TransferNormalizer).add(makeTransformer(type, normalize));
}
