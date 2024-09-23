import { ServiceProvider, ServiceSet } from '../di';
import {
  HttpContext,
  HttpContextHost,
  HttpParams,
  HttpPipeline,
  HttpQuery,
  HttpRequest,
  HttpResponse,
  HttpServer
} from '../http';
import { ApplicationFeature } from './feature';

export class HttpServerFeature implements ApplicationFeature {
  configureServices(serviceSet: ServiceSet) {
    const pipeline = new HttpPipeline();

    const httpServerFactory = (provider: ServiceProvider) => {
      return new HttpServer({ callback: pipeline, provider, });
    };

    serviceSet.addValue(HttpPipeline, pipeline)
      .addSingleton(HttpServer, httpServerFactory, [ServiceProvider]);

    serviceSet.addScoped(HttpContextHost)
      .addInherited(HttpContext, (host: HttpContextHost) => {
        if (!host.context) {
          throw new Error('HttpContext is missing');
        }
        return host.context;
      }, [HttpContextHost])
      .addInherited(HttpRequest, (context: HttpContext) => context.request, [HttpContext])
      .addInherited(HttpParams, (request: HttpRequest) => request.params, [HttpRequest])
      .addInherited(HttpQuery, (request: HttpRequest) => request.query, [HttpRequest])
      .addInherited(HttpResponse, (context: HttpContext) => context.response, [HttpContext])
    ;
  }
}

export function addHttpServer(): HttpServerFeature {
  return new HttpServerFeature();
}
