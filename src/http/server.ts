import { createServer, Server } from 'http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceConfigurator, ServiceProvider } from '../service';

export function addHttpServer(conf: ServiceConfigurator): void {
  conf.singleton(Server, (initial: ServiceProvider) => {
      return createServer((request, response) => {
        const scoped = initial.createScope();
        scoped(HttpContextHost, host => {
          const context = new HttpContext(request, response, scoped);
          host.bindContext(context);
        });
        scoped.setSelfToObject(request);
        response.once('close', () => scoped.destroyScope());
      });
    }, [ServiceProvider])
    .scoped(HttpContextHost)
    .factory(HttpContext, (host: HttpContextHost) => {
      if (!host.context) {
        throw new Error('HttpContext is missing');
      }
      return host.context;
    }, [HttpContextHost]);
}

