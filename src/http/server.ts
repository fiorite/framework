import { createServer, Server } from 'http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceCollection, ServiceProvider } from '../service';

export function addHttpServer(configure: ServiceCollection): void {
  configure
    .addSingletonFactory(Server, (initialProvider: ServiceProvider) => {
      return createServer((request, response) => {
        const scopeProvider = initialProvider.createScope();
        scopeProvider(HttpContextHost, host => {
          const context = new HttpContext(request, response, scopeProvider);
          host.useContext(context);
        });
        scopeProvider.bindTo(request);
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
