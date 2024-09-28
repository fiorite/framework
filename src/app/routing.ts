import { ApplicationFeature } from './feature';
import { ServiceProviderWithReturnFunction, ServiceSet } from '../di';
import { RouteDescriptor, RouteMatcher, RouteParams, RouteSet, RoutingMiddleware } from '../routing';
import { HttpPipeline } from '../http';

export class RoutingFeature implements ApplicationFeature {
  private readonly _routeSet = new RouteSet();
  private readonly _routeMatcher: RouteMatcher;
  private readonly _middleware: RoutingMiddleware;

  constructor(routes: Iterable<RouteDescriptor>) {
    this._routeSet = new RouteSet(routes);
    this._routeMatcher = new RouteMatcher(this._routeSet);
    this._middleware = new RoutingMiddleware(this._routeMatcher);
  }

  configureServices(serviceSet: ServiceSet) {
    serviceSet.addScoped(RouteParams)
      .addValue(RouteMatcher, this._routeMatcher)
      .addValue(RoutingMiddleware, this._middleware);
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    provide(HttpPipeline).add(this._middleware);
  }
}

export function addRouting(routes: Iterable<RouteDescriptor>): RoutingFeature {
  return new RoutingFeature(routes);
}

export class RoutesFeature implements ApplicationFeature {
  constructor(routes: Iterable<RouteDescriptor>) {
    throw new Error('not implemented');
  }
}

export function addRoute(route: RouteDescriptor): RoutesFeature {
  return new RoutesFeature([route]);
}
