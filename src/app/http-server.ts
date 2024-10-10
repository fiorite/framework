import { ServiceProvider } from '../di';
import { HttpContext, HttpContextHost, HttpPipeline, HttpQuery, HttpRequest, HttpResponse, HttpServer } from '../http';
import { ApplicationConfigureFunction } from './application';

export const httpServerPort = Symbol('HttpServer.port');

export function featureHttpServer(port?: number): ApplicationConfigureFunction {
  return provider => {
    const pipeline = new HttpPipeline();
    provider.addValue(httpServerPort, port || Number(process.env['PORT'] || 3000))
      .addValue(HttpPipeline, pipeline)
      .addSingleton(HttpServer, (provider: ServiceProvider) => {
        return new HttpServer((context, next) => {
          const scopedProvider = ServiceProvider.createScoped(provider);
          const requestContext = new HttpContext(context.request, context.response, scopedProvider);
          scopedProvider(HttpContextHost).apply(requestContext);
          pipeline(requestContext, next);
          context.response.on('close', () => ServiceProvider.destroyScoped(scopedProvider));
        });
      }, [ServiceProvider])
      .addScoped(HttpContextHost)
      .addInherited(HttpContext, (host: HttpContextHost) => {
        if (!host.context) {
          throw new Error('HttpContext is missing');
        }
        return host.context;
      }, [HttpContextHost])
      .addInherited(HttpRequest, (context: HttpContext) => context.request, [HttpContext])
      .addInherited(HttpQuery, (request: HttpRequest) => request.query, [HttpRequest])
      .addInherited(HttpResponse, (context: HttpContext) => context.response, [HttpContext])
    ;
  };
}
