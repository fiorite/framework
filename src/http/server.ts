import { createServer, Server } from 'http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceConfigurator, ServiceProvider } from '../service';

export function addHttpServer(configure: ServiceConfigurator): void {
  configure
    .addSingletonFactory(Server, (initialProvider: ServiceProvider) => {
      return createServer((request, response) => {
        const scopeProvider = initialProvider.createScope();
        scopeProvider(HttpContextHost, host => {
          const context = new HttpContext(request, response, scopeProvider);
          host.useContext(context);
        });
        scopeProvider.setSelfToObject(request);
        response.once('close', () => scopeProvider.destroyScope());
      });
    }, [ServiceProvider])
    .addScoped(HttpContextHost)
    .addFactory(HttpContext, (host: HttpContextHost) => {
      if (!host.context) {
        throw new Error('HttpContext is missing');
      }
      return host.context;
    }, [HttpContextHost]);
}

