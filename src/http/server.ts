import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { HttpContext, HttpContextHost } from './context';
import { ServiceProvider } from '../di';
import { NodeServerRequest, NodeServerResponse } from './node';
import { doNothing, FunctionClass, ValueCallback } from '../core';
import { HttpCallback } from './callback';

/** @deprecated will be replaced with listener */
export enum HttpServerState {
  Stopped,
  Starting,
  Listening,
  Stopping,
}

/**
 * ERR_SERVER_ALREADY_LISTEN
 */
export class HttpServer extends FunctionClass<HttpCallback> {
  /** @deprecated will be moved to listener */
  private _original?: Server;

  /** @deprecated will be moved to listener */
  get original(): Server | undefined {
    return this._original;
  }

  /** @deprecated will be moved to listener */
  private _state = HttpServerState.Stopped;

  /** @deprecated will be moved to listener */
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
    if (this._provider.scope) {
      throw new Error('unable to apply service provide with defined scope in http server.');
    }
  }

  //
  // handle(context: HttpContext): void {
  //   this._callback(context);
  // }

  handleOriginal(req: IncomingMessage, res: ServerResponse): void {
    const provider = this._provider.makeScopedProvider();
    const context = new HttpContext(
      new NodeServerRequest(req),
      new NodeServerResponse(res),
      provider,
    );
    provider(HttpContextHost).apply(context);
    res.once('close', () => provider.destroyScope());
    this._callback(context, doNothing);
  }

  /**
   * @deprecated refactor to #listen(): Listener
   */
  start(port: number, callback: ValueCallback<unknown> = doNothing): void {
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
        callback(void 0);
      });
    });
  }

  listen(port: number, callback: ValueCallback<unknown> = doNothing): HttpServerListener {
    throw new Error('Not implemented.');
  }

  /**
   * @deprecated refactor to #listen(): Listener
   */
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

export class HttpServerListener {
  private _server: Server;

  get server(): Server {
    return this._server;
  }

  constructor(server: Server) {
    this._server = server;
  }

  close(callback: ValueCallback<Error | undefined> = doNothing): void {
    // this._server.close();
    // originalServer.closeAllConnections();
  }
}
