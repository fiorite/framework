import { createServer, IncomingMessage, Server } from 'http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceCollection, ServiceProvider } from '../service';
import { NodeRequest, NodeResponse } from './node';
import { HttpRequest } from './request';
import { HttpResponse } from './response';
import { ServerResponse } from 'node:http';

export function addHttpServer(conf: ServiceCollection): void {
  conf.addSingleton(Server, (initial: ServiceProvider) => {
    return createServer((request, response: ServerResponse) => {
      const scopeProvider = initial.createScope();
      const contextHost = scopeProvider(HttpContextHost);
      const context = new HttpContext(
        new NodeRequest(request),
        new NodeResponse(response),
        scopeProvider,
      );
      contextHost.bindContext(context);
      scopeProvider.setSelfTo(request);
      response.once('close', () => scopeProvider.destroyScope());
    });
  }, [ServiceProvider])
    .addScoped(HttpContextHost)
    .addFactory(HttpContext, (host: HttpContextHost) => {
      if (!host.context) {
        throw new Error('HttpContext is missing');
      }
      return host.context;
    }, [HttpContextHost])
    .addScoped(HttpRequest, (context: HttpContext) => context.request, [HttpContext])
    .addScoped(IncomingMessage, (context: HttpContext) => {
      if (context.request instanceof NodeRequest) {
        return context.request.request;
      }
      throw new Error('IncomingMessage not bound.');
    }, [HttpContext])
    .addScoped(HttpResponse, (context: HttpContext) => context.response, [HttpContext])
    .addScoped(ServerResponse, (context: HttpContext) => {
      if (context.response instanceof NodeResponse) {
        return context.response.response;
      }
      throw new Error('ServerResponse not bound.');
    }, [HttpContext])
  ;
}

