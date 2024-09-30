import { ApplicationFeature } from './feature';
import { ServiceProviderWithReturnFunction, ServiceSet } from '../di';
import { ResultHandleCallback, RouteDescriptor, RouteMatcher, RouteParams, RoutingMiddleware } from '../routing';
import { HttpCallback, HttpMethod, HttpPipeline } from '../http';
import { ValueCallback } from '../core';

export class RoutingFeature implements ApplicationFeature {
  private readonly _routeMatcher: RouteMatcher;
  private readonly _middleware: RoutingMiddleware;

  constructor(handleResult: ResultHandleCallback) {
    this._routeMatcher = new RouteMatcher([]);
    this._middleware = new RoutingMiddleware(this._routeMatcher, handleResult);
  }

  registerServices(serviceSet: ServiceSet) {
    serviceSet.addScoped(RouteParams)
      .addValue(RouteMatcher, this._routeMatcher)
      .addValue(RoutingMiddleware, this._middleware);
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    provide(HttpPipeline).add(this._middleware);
  }
}

export class RouteAddFeature implements ApplicationFeature {
  private readonly _callback: ValueCallback<RouteMatcher>;

  get callback(): ValueCallback<RouteMatcher> {
    return this._callback;
  }

  constructor(callback: ValueCallback<RouteMatcher>) {
    this._callback = callback;
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    this.callback(provide(RouteMatcher));
  }
}

export function addRouting(handleResult: ResultHandleCallback = (_context, _value, next) => next()): RoutingFeature {
  return new RoutingFeature(handleResult);
}

export function addRoute(descriptor: RouteDescriptor): RouteAddFeature;
export function addRoute(path: string, callback: HttpCallback): RouteAddFeature;
export function addRoute(method: HttpMethod | string, path: string, callback: HttpCallback): RouteAddFeature;
export function addRoute(...args: unknown[]): RouteAddFeature {
  return new RouteAddFeature(routeSet => {
    args[0] instanceof RouteDescriptor ? routeSet.add(args[0]) : (routeSet.map as Function)(...args);
  });
}
