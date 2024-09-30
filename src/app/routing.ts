import { ApplicationFeature, LateConfiguration } from './feature';
import { ServiceProviderWithReturnFunction, ServiceSet } from '../di';
import { RouteDescriptor, RouteMatcher, RouteParams, RouteSet, RoutingMiddleware } from '../routing';
import { HttpCallback, HttpMethod, HttpPipeline } from '../http';
import { ValueCallback } from '../core';

export class RoutingFeature implements ApplicationFeature {
  private readonly _routeSet = new RouteSet();
  private readonly _routeMatcher: RouteMatcher;
  private readonly _middleware: RoutingMiddleware;

  constructor(routes: Iterable<RouteDescriptor> = []) {
    this._routeSet = new RouteSet(routes);
    this._routeMatcher = new RouteMatcher(this._routeSet);
    this._middleware = new RoutingMiddleware(this._routeMatcher);
  }

  configureServices(serviceSet: ServiceSet) {
    serviceSet.addScoped(RouteParams)
      .addValue(RouteSet, this._routeSet)
      .addValue(RouteMatcher, this._routeMatcher)
      .addValue(RoutingMiddleware, this._middleware);
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    provide(HttpPipeline).add(this._middleware);
    provide(LateConfiguration).add(() => {
      this._routeMatcher.rebuild(this._routeSet);
    });
  }
}

export class RouteAddFeature implements ApplicationFeature {
  private readonly _callback: ValueCallback<RouteSet>;

  get callback(): ValueCallback<RouteSet> {
    return this._callback;
  }

  constructor(callback: ValueCallback<RouteSet>) {
    this._callback = callback;
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    this.callback(provide(RouteSet));
  }
}

export function addRouting(routes: Iterable<RouteDescriptor> = []): RoutingFeature {
  return new RoutingFeature(routes);
}

export function addRoute(descriptor: RouteDescriptor): RouteAddFeature;
export function addRoute(path: string, callback: HttpCallback): RouteAddFeature;
export function addRoute(method: HttpMethod | string, path: string, callback: HttpCallback): RouteAddFeature;
export function addRoute(...args: unknown[]): RouteAddFeature {
  return new RouteAddFeature(routeSet => {
    args[0] instanceof RouteDescriptor ? routeSet.add(args[0]) : (routeSet.map as Function)(...args);
  });
}
