import { HttpContext } from './context';
import { doNothing, FunctionClass, VoidCallback } from '../core';
import { HttpResponseHeader } from './response';
import { HttpMethod } from './method';
import { HttpStatusCode } from './status-code';
import { HttpRequestHeader } from './request';
import { HttpCallback } from './callback';

export type HttpMiddleware = (context: HttpContext, next: VoidCallback) => unknown;

export class MiddlewareBridge extends FunctionClass<HttpMiddleware> {
  constructor(a: HttpMiddleware, b: HttpMiddleware) {
    super((context, next) => {
      a(context, () => b(context, next));
    });
  }
}

export class HttpPipeline extends FunctionClass<HttpCallback> {
  private _array: readonly HttpMiddleware[];
  private _middleware: HttpMiddleware;
  private _fallback: VoidCallback;

  constructor(array: readonly HttpMiddleware[], fallback: VoidCallback = doNothing) {
    const middleware = array.reduce((bridge, next) => new MiddlewareBridge(next, bridge));
    super(context => middleware(context, fallback));
    this._array = array;
    this._middleware = middleware;
    this._fallback = fallback;
  }
}

export namespace HttpMiddleware {
  export function all(array: readonly HttpMiddleware[], fallback: VoidCallback): HttpCallback {
    return new HttpPipeline(array);
  }
}

export class CorsHttpMiddleware extends FunctionClass<HttpMiddleware> {
  constructor() {
    super(({ request, response }, next) => {
      response.headers.set(HttpResponseHeader.AccessControlAllowOrigin, '*');
      response.headers.set(HttpResponseHeader.AccessControlAllowCredentials, 'true');

      const method = request.method ? request.method.toUpperCase() : undefined;

      if (HttpMethod.Options === method) {
        response.statusCode = HttpStatusCode.NoContent;
        response.headers.set(HttpResponseHeader.AccessControlAllowMethods, 'GET,HEAD,PUT,PATCH,POST,DELETE');
        response.headers.set(HttpResponseHeader.ContentType, '0');
        const allowedHeaders = request.headers.get(HttpRequestHeader.AccessControlRequestHeaders);
        if (allowedHeaders) {
          response.headers.set(HttpResponseHeader.AccessControlAllowHeaders, allowedHeaders);
        }
        response.close();
      } else {
        next();
      }
    });
  }
}
