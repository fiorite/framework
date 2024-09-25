import { MapCallback, MaybePromise, returnSelf } from '../core';
import { HttpQuery, HttpRequest } from './request';
import { Provide, ProvideDecorator } from '../di';
import { HttpContext } from './context';
import { HttpBodyResult } from './result';
import { HttpHeaders } from './headers';

export function FromRequest<R>(callback: MapCallback<HttpRequest, MaybePromise<R>>): ProvideDecorator<HttpContext, MaybePromise<R>> {
  return Provide(HttpContext, context => callback(context.request)).calledBy(FromRequest);
}

export function FromQuery(key: string): ProvideDecorator<HttpContext, string | undefined>;
export function FromQuery<R>(key: string, callback: MapCallback<string | undefined, MaybePromise<R>>): ProvideDecorator<HttpContext, MaybePromise<R>>;
export function FromQuery<R>(callback: MapCallback<HttpQuery, R>): ProvideDecorator<HttpContext, MaybePromise<R>>;
export function FromQuery(...args: unknown[]) {
  let callback: MapCallback<HttpQuery, unknown>;
  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      const key = args[0];
      callback = query => query.get(key);
    } else {
      callback = args[0] as MapCallback<HttpQuery, unknown>;
    }
  } else {
    callback = params => {
      const value = params.get(args[0] as string);
      return (args[1] as MapCallback<string | undefined, unknown>)(value);
    };
  }

  return FromRequest(request => callback(request.query)).calledBy(FromQuery);
}

export function FromHeader(key: string): ProvideDecorator<HttpContext, string | string[] | number | undefined>;
export function FromHeader<R>(key: string, callback: MapCallback<string | string[] | number | undefined, MaybePromise<R>>): ProvideDecorator<HttpContext, MaybePromise<R>>;
export function FromHeader<R>(callback: MapCallback<HttpHeaders, R>): ProvideDecorator<HttpContext, MaybePromise<R>>;
export function FromHeader(...args: unknown[]) {
  let callback: MapCallback<HttpHeaders, unknown>;
  if (1 === args.length) {
    if ('string' === typeof args[0]) {
      const key = args[0];
      callback = headers => headers.get(key);
    } else {
      callback = args[0] as MapCallback<HttpHeaders, unknown>;
    }
  } else {
    callback = params => {
      const value = params.get(args[0] as string);
      return (args[1] as MapCallback<string | string[] | number | undefined, unknown>)(value);
    };
  }

  return FromRequest(request => callback(request.headers)).calledBy(FromQuery);
}

export function FromBody<T>(): ProvideDecorator<HttpBodyResult<T>, T | undefined>;
export function FromBody<T, R>(callback: MapCallback<T | undefined, MaybePromise<R>>): ProvideDecorator<HttpBodyResult<T>, MaybePromise<R>>;
export function FromBody(...args: unknown[]) {
  let callback: MapCallback<unknown, unknown> = returnSelf;
  if (1 === args.length) {
    callback = args[0] as MapCallback<unknown, unknown>;
  }
  return Provide<HttpBodyResult<unknown>>(HttpBodyResult, body => callback(body.value)).calledBy(FromBody);
}
