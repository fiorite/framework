import { FunctionClass } from '../core';
import { HttpCallback } from './callback';
import { HttpResponseHeader } from './response';
import { HttpMethod } from './method';
import { HttpStatusCode } from './status-code';
import { HttpRequestHeader } from './request';
import { ServiceProvider } from '../di';
import { HttpPipeline } from './pipeline';

export class CorsMiddleware extends FunctionClass<HttpCallback> {
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

export function addCors(provider: ServiceProvider): void {
  const middleware = new CorsMiddleware();
  provider.addValue(CorsMiddleware, middleware);
  provider(HttpPipeline).add(middleware);
}

