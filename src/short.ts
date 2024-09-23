import { addConsoleLogger, addCors, addRoute, AddRoutesFeature, addService, CorsFeature, makeApplication } from './app';
import { makeServiceProvider, ServiceDescriptor } from './di';
import { HttpCallback, HttpMethod } from './http';
import { RouteDescriptor } from './router';
import { Type } from './core';

// todo: extend api with all the features in the package.

export const make = Object.freeze({
  application: makeApplication,
  provider: makeServiceProvider,
});

export function cors(): CorsFeature {
  return addCors();
}

export function all(path: string, callback: HttpCallback): AddRoutesFeature {
  return addRoute(new RouteDescriptor({ path, callback }));
}

export function get(path: string, callback: HttpCallback): AddRoutesFeature {
  return addRoute(new RouteDescriptor({ path, callback, method: HttpMethod.Get, }));
}

export function add(...values: readonly (Type | ServiceDescriptor | object)[]) {
  return addService(...values);
}

// todo: add routes

export const logger = {
  console: addConsoleLogger,
};
