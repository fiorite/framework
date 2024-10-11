import { ServiceProvider } from '../di';
import { HttpContext, HttpContextHost, HttpPipeline, HttpQuery, HttpRequest, HttpResponse, HttpServer } from '../http';
import { ApplicationConfigureFunction } from './application';
import { currentJsPlatform, emptyCallback, JsPlatform, VoidCallback } from '../core';
import type { NodeJsServerRequest, NodeJsServerResponse } from '../http/nodejs';

export const httpServerPort = Symbol('HttpServer.port');

export function featureHttpServer(port: number, complete: VoidCallback = emptyCallback): ApplicationConfigureFunction {
  return provider => {
    const pipeline = new HttpPipeline();
    provider.addValue(httpServerPort, port)
      .addValue(HttpPipeline, pipeline)
      .addSingleton(HttpServer, (provider: ServiceProvider) => {
        return new HttpServer((context, next) => {
          const scopedProvider = ServiceProvider.createWithScope(provider);
          const requestContext = new HttpContext(context.request, context.response, scopedProvider);
          scopedProvider(HttpContextHost).apply(requestContext);
          pipeline(requestContext, next);
          context.response.on('close', () => ServiceProvider.destroyScope(scopedProvider));
        });
      }, [ServiceProvider])
      .addScoped(HttpContextHost)
      .addPrototype(HttpContext, (host: HttpContextHost) => {
        if (!host.context) {
          throw new Error('HttpContext is missing');
        }
        return host.context;
      }, [HttpContextHost])
      .addPrototype(HttpRequest, (context: HttpContext) => context.request, [HttpContext])
      .addPrototype(HttpQuery, (request: HttpRequest) => request.query, [HttpRequest])
      .addPrototype(HttpResponse, (context: HttpContext) => context.response, [HttpContext])
    ;

    if (currentJsPlatform === JsPlatform.NodeJs) {
      import('http').then(m => {
        provider.addPrototype(m.IncomingMessage, request => (request as NodeJsServerRequest).original, [HttpRequest])
          .addPrototype(m.ServerResponse, response => (response as NodeJsServerResponse).original, [HttpResponse]);
        complete();
      });
    } else {
      complete();
    }
  };
}
