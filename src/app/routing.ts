import { RouteMatcher, RouteParams, RoutingMiddleware } from '../routing';
import { HttpPipeline } from '../http';
import { ApplicationConfigureFunction } from './application';
import { TransferNormalizer, TypeTransformer } from '../data';

export function addRouting(...transformers: TypeTransformer[]): ApplicationConfigureFunction {
  return provider => {
    const routeMatcher = new RouteMatcher([]);
    const normalizer = new TransferNormalizer(transformers);
    const middleware = new RoutingMiddleware(routeMatcher, normalizer);

    provider.addScoped(RouteParams)
      .addValue(TransferNormalizer, normalizer)
      .addValue(RouteMatcher, routeMatcher)
      .addValue(RoutingMiddleware, middleware);

    provider(HttpPipeline).add(middleware);
  };
}
