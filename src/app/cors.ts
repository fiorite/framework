import { FunctionClass } from '../core';
import {
  HttpMethod,
  HttpMiddleware,
  HttpPipeline,
  HttpRequestHeader,
  HttpResponseHeader,
  HttpStatusCode
} from '../http';
import { ApplicationFeature } from './feature';
import { InstantServiceProvideFunction, ServiceSet } from '../di';

export class CorsMiddleware extends FunctionClass<HttpMiddleware> {
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

export class CorsFeature implements ApplicationFeature {
  private readonly _middleware: CorsMiddleware;

  constructor(middleware: CorsMiddleware) {
    this._middleware = middleware;
  }

  configureServices(serviceSet: ServiceSet) {
    serviceSet.addValue(CorsMiddleware, this._middleware);
  }

  configure(provide: InstantServiceProvideFunction) {
    provide(HttpPipeline).add(this._middleware);
  }
}

export function addCors(): CorsFeature {
  const middleware = new CorsMiddleware();
  return new CorsFeature(middleware);
}

