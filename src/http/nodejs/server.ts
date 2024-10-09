import { emptyCallback, FunctionClass, VoidCallback } from '../../core';
import { createServer, IncomingMessage, RequestListener, Server, ServerResponse } from 'node:http';
import { HttpCallback } from '../callback';
import { HttpContext } from '../context';
import type { HttpServerRunner } from '../server';
import { NodeJsServerRequest } from './server-request';
import { NodeJsServerResponse } from './server-response';

export class NodeJsHttpServer extends FunctionClass<RequestListener> implements HttpServerRunner {
  private readonly _original: Server;

  get original(): Server {
    return this._original;
  }

  constructor(callback: HttpCallback) {
    const requestListener = (req: IncomingMessage, res: ServerResponse) => {
      const context = new HttpContext(new NodeJsServerRequest(req), new NodeJsServerResponse(res));
      callback(context, emptyCallback);
    };
    super(requestListener);
    this._original = createServer(requestListener);
  }

  listen(port: number, listening: VoidCallback = emptyCallback): void {
    this._original.listen(port, listening);
  }
}
