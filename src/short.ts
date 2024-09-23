import {
  addConsoleLogger,
  addCors,
  addFactory,
  addRoute,
  RoutesFeature,
  addRouting,
  ServicesFeature,
  addType,
  addValue,
  CorsFeature,
  makeApplication
} from './app';
import { makeServiceProvider, ServiceBehavior, ServiceType } from './di';
import { HttpCallback, HttpMethod } from './http';
import { RouteDescriptor } from './router';
import { Type } from './core';
import { ServiceFactoryReturnFunction } from './di/function';

// todo: extend api with all the features in the package.

export const make = Object.freeze({
  application: makeApplication,
  provider: makeServiceProvider,
  router: addRouting,
});

export function cors(): CorsFeature {
  return addCors();
}

export function all(path: string, callback: HttpCallback): RoutesFeature {
  return addRoute(new RouteDescriptor({ path, callback }));
}

export function get(path: string, callback: HttpCallback): RoutesFeature {
  return addRoute(new RouteDescriptor({ path, callback, method: HttpMethod.Get, }));
}

export function add(value: object): ServicesFeature;
export function add<T>(type: ServiceType<T>, value: T): ServicesFeature;
export function add(...args: unknown[]): ServicesFeature {
  return (addValue as Function)(...args);
}

export function type<T>(type: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function type<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function type(...args: unknown[]): ServicesFeature {
  return (addType as Function)(...args);
}

export function factory<T>(
  type: ServiceType<T>,
  factory: ServiceFactoryReturnFunction<T>,
  dependencies: ServiceType[] = [],
  behaviour?: ServiceBehavior,
): ServicesFeature {
  return addFactory(type, factory, dependencies, behaviour);
}

// todo: add routes

export const logger = {
  console: addConsoleLogger,
};
