import { Provide, Service } from '../service';
import { IncomingMessage } from 'http';
import {
  ClassDecoratorWithData,
  makeClassDecorator,
  makeMethodDecorator,
  MapCallback,
  MaybePromise,
  MethodDecoratorWithData
} from '../core';
import { HttpMethod } from '../http';

export function Controller(options: {
  readonly routePrefix?: string;
} = {}): ClassDecoratorWithData<typeof options> {
  return makeClassDecorator(Controller, options, [Service()]);
}

export function RoutePrefix(path: string): ClassDecorator {
  return Controller({routePrefix: path});
}

export function Route(path?: string, httpMethod?: HttpMethod | string): MethodDecoratorWithData<{
  path?: string;
  httpMethod?: HttpMethod | string;
}> {
  return makeMethodDecorator(Route, {path, httpMethod});
}

export const HttpGet = (path?: string) => Route(path, HttpMethod.Get);

export const HttpHead = (path?: string) => Route(path, HttpMethod.Head);

export const HttpPost = (path?: string) => Route(path, HttpMethod.Post);

export const HttpPut = (path?: string) => Route(path, HttpMethod.Put);

export const HttpDelete = (path?: string) => Route(path, HttpMethod.Delete);

export const HttpConnect = (path?: string) => Route(path, HttpMethod.Connect);

export const HttpOptions = (path?: string) => Route(path, HttpMethod.Options);

export const HttpTrace = (path?: string) => Route(path, HttpMethod.Trace);

export const HttpPatch = (path?: string) => Route(path, HttpMethod.Patch);

export const FromRequest = <R>(callback: MapCallback<IncomingMessage, MaybePromise<R>>) => Provide(IncomingMessage, callback);

export const FromParam = <R = unknown>(paramName: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  return FromRequest(request => {
    const queryValue = (request as any).params[paramName] as string | undefined;
    return callback!(queryValue);
  });
};

export const FromQuery = <R = unknown>(queryKey: string, callback?: MapCallback<string | undefined, MaybePromise<R>>) => {
  if (!callback) {
    callback = (x => x) as MapCallback<string | undefined, MaybePromise<R>>;
  }

  return FromRequest(request => {
    const queryValue = (request as any).query[queryKey] as string | undefined;
    return callback!(queryValue);
  });
};

export const FromBody = <T = unknown, R = unknown>(callback?: MapCallback<T, MaybePromise<R>>) => {
  if (!callback) {
    callback = ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }

  return FromRequest(request => callback!((request as any).body as T));
};
