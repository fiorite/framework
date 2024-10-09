import { ServiceProvider, ServiceSet } from '../di';
import { HttpContext, HttpContextHost, HttpPipeline, HttpQuery, HttpRequest, HttpResponse, HttpServer } from '../http';
import { ApplicationFeature } from './feature';

export class HttpServerFeature implements ApplicationFeature {
  private readonly _port: number;

  get port(): number {
    return this._port;
  }

  constructor(port?: number) {
    this._port = port || Number(process.env['PORT'] || 3000);
  }

  registerServices(serviceSet: ServiceSet) {
    const pipeline = new HttpPipeline();

    serviceSet.addValue(HttpServerFeature, this)
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
  }
}

export function addHttpServer(port?: number): HttpServerFeature {
  return new HttpServerFeature(port);
}
