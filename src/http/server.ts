import {
  CallbackWithThen,
  ComputedCallback,
  computedCallback,
  currentJsPlatform,
  FunctionClass,
  JsPlatform,
  VoidCallback
} from '../core';
import { HttpCallback } from './callback';
import type { NodeJsHttpServer } from './nodejs';

export interface HttpServerRunner {
  listen(port: number, listening: VoidCallback): void;
}

declare const process: any;

export class HttpServer extends FunctionClass<HttpCallback> implements HttpServerRunner {
  private readonly _callback: HttpCallback;

  private readonly _platformRunner: ComputedCallback<HttpServerRunner>;

  get platformRunner(): CallbackWithThen<HttpServerRunner> {
    return this._platformRunner;
  }

  private readonly _nodeJsRunner: ComputedCallback<NodeJsHttpServer>;

  get nodeJsRunner(): CallbackWithThen<NodeJsHttpServer> {
    return this._nodeJsRunner;
  }

  constructor(callback: HttpCallback) {
    super(callback);
    this._callback = callback;
    this._nodeJsRunner = computedCallback(complete => {
      import('./nodejs').then(module => {
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
