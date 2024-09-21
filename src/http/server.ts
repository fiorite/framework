import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceProvider, ServiceSet } from '../di';
import { NodeRequest, NodeResponse } from './node';
import { HttpRequest } from './request';
import { HttpResponse } from './response';
import { doNothing, FunctionClass, ValueCallback, VoidCallback } from '../core';
import { HttpCallback } from './callback';

export function addHttpServer(set: ServiceSet, factory: (provide: ServiceProvider) => HttpCallback): void {
  const httpServerFactory = (provider: ServiceProvider) => {
    return new HttpServer({ callback: factory(provider), provider, });
  };

  set.addSingleton(HttpServer, httpServerFactory, [ServiceProvider])
    .addScoped(HttpContextHost)
    .addInherited(HttpContext, (host: HttpContextHost) => {
      if (!host.context) {
        throw new Error('HttpContext is missing');
      }
      return host.context;
    }, [HttpContextHost])
    .addInherited(HttpRequest, (context: HttpContext) => context.request, [HttpContext])
    .addInherited(HttpResponse, (context: HttpContext) => context.response, [HttpContext])
  ;
}

export enum HttpServerState {
  Stopped,
  Starting,
  Listening,
  Stopping,
}

export class HttpServer extends FunctionClass<HttpCallback> {
  private _original?: Server;

  get original(): Server | undefined {
    return this._original;
  }

  private _state = HttpServerState.Stopped;

  get state(): HttpServerState {
    return this._state;
  }

  private _provider: ServiceProvider;
  private readonly _callback: HttpCallback;

  constructor(object: {
    readonly provider: ServiceProvider;
    readonly callback: HttpCallback;
  }) {
    super(object.callback);
    this._provider = object.provider;
    this._callback = object.callback;
    if (this._provider.scopeDefined) {
      throw new Error('unable to apply service provide with defined scope in http server.');
    }
  }

  handle(context: HttpContext): void {
    this._callback(context);
  }

  handleOriginal(req: IncomingMessage, res: ServerResponse): void {
    const provider = this._provider.createScope();
    const context = new HttpContext(
      new NodeRequest(req),
      new NodeResponse(res),
      provider,
    );
    provider(HttpContextHost).apply(context);
    res.once('close', () => provider.destroyScope());
    this._callback(context);
  }

  start(port: number, callback: VoidCallback = doNothing): void {
    if (this._state !== HttpServerState.Stopped) {
      throw new Error('server is supposed to be stopped in order to start it.');
    }
    // todo: check if platform is nodejs and not browser.
    this._state = HttpServerState.Starting;

    import('http').then(x => {
      const listener = this.handleOriginal.bind(this);
      const originalServer = x.createServer(listener);
      this._original = originalServer;

      originalServer.on('close', () => this.stop());
      originalServer.listen(port, () => {
        this._state = HttpServerState.Listening;
        callback();
      });
    });
  }

  stop(callback: ValueCallback<Error | undefined> = doNothing): void {
    if (this._state === HttpServerState.Stopped) {
      throw new Error('unable to stop inactive server.');
    }
    if (this._state === HttpServerState.Stopping) {
      throw new Error('unable to stop server that is being stopped.');
    }
    this._state = HttpServerState.Stopping;
    const originalServer = this.original;
    if (undefined !== originalServer) {
      originalServer.close(err => {
        this._state = HttpServerState.Stopped;
        callback(err);
      });
      originalServer.closeAllConnections();
      delete this._original;
    } else {
      this._state = HttpServerState.Stopped;
      callback(void 0);
    }
  }
}
