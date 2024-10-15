import {
  PromiseLikeCallback,
  ComputedCallback,
  computedCallback,
  currentJsPlatform,
  FunctionClass,
  JsPlatform,
  VoidCallback, emptyCallback
} from '../core';
import { HttpCallback } from './callback';
import type { NodeJsHttpServer, NodeJsServerRequest, NodeJsServerResponse } from '../nodejs';
import { ServiceProvider } from '../di';
import { HttpPipeline } from './pipeline';
import { HttpContext, HttpContextHost } from './context';
import { HttpQuery, HttpRequest } from './request';
import { HttpResponse } from './response';

export interface HttpServerRunner {
  listen(port: number, listening: VoidCallback): void;
}

export class HttpServer extends FunctionClass<HttpCallback> implements HttpServerRunner {
  private readonly _callback: HttpCallback;

  private readonly _platformRunner: ComputedCallback<HttpServerRunner>;

  get platformRunner(): PromiseLikeCallback<HttpServerRunner> {
    return this._platformRunner;
  }

  private readonly _nodeJsRunner: ComputedCallback<NodeJsHttpServer>;

  get nodeJsRunner(): PromiseLikeCallback<NodeJsHttpServer> {
    return this._nodeJsRunner;
  }

  constructor(callback: HttpCallback) {
    super(callback);
    this._callback = callback;
    this._nodeJsRunner = computedCallback(complete => {
      import('../nodejs').then(module => {
        complete(new module.NodeJsHttpServer(this._callback));
      });
    });
    this._platformRunner = computedCallback(complete => {
      if (JsPlatform.NodeJs === currentJsPlatform) {
        return this._nodeJsRunner.then(complete);
      }

      throw new Error('no other platforms available to be used as HttpServer.');
    });
  }

  listen(port: number, listening: VoidCallback): void {
    this._platformRunner.then(server => server.listen(port, listening));
  }
}

export const httpServerPort = Symbol('HttpServer.port');

export function addHttpServer(provider: ServiceProvider, serverPort: number, runnerLoaded: VoidCallback = emptyCallback) {
  const pipeline = new HttpPipeline();
  provider.addValue(httpServerPort, serverPort)
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
    import('http').then(m => { // todo: refactor perhaps with runner check
      provider.addPrototype(m.IncomingMessage, request => (request as NodeJsServerRequest).original, [HttpRequest])
        .addPrototype(m.ServerResponse, response => (response as NodeJsServerResponse).original, [HttpResponse]);
      runnerLoaded();
    });
  } else {
    runnerLoaded();
  }
}
