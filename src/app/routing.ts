import { RouteMatcher, RouteParams, RoutingMiddleware } from '../routing';
import { HttpPipeline } from '../http';
import { makeTransformer, TransferNormalizer, TransformCallback } from '../data';
import { ServiceProvider } from '../di';
import { Type } from '../core';
import { ApplicationConfigureFunction } from './application';

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

export function addTransformer<T, R>(type: Type<T>, transform: TransformCallback<T, R>): ApplicationConfigureFunction {
  return provide => provide(TransferNormalizer).add(makeTransformer(type, transform));
}
