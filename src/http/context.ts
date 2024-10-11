import { ServiceProvideFunction, ServiceProvider } from '../di';
import { HttpRequest } from './request';
import { HttpResponse } from './response';
import { ValueCallback, VoidCallback } from '../core';

export class HttpContext {
  private readonly _request: HttpRequest;

  get request(): HttpRequest {
    return this._request;
  }

  private readonly _response: HttpResponse;

  get response(): HttpResponse {
    return this._response;
  }

  private readonly _provide?: ServiceProvider;

  get provide(): ServiceProvider | undefined {
    return this._provide;
  }

  constructor(request: HttpRequest, response: HttpResponse, provide?: ServiceProvider) {
    this._request = request;
    this._response = response;
    this._provide = provide;
  }

  // direction => request <- response

  read(callback: ValueCallback<Uint8Array | undefined>): void {
    this.request.read(callback);
  }

  /**
   * @param chunk
   * @param callback called on flush
   */
  write(chunk: Uint8Array | string, callback?: VoidCallback): void {
    this.response.write(chunk, callback);
  }
}

export class HttpContextHost {
  private _context?: HttpContext;

  get context(): HttpContext | undefined {
    return this._context;
  }

  apply(context: HttpContext): void {
    if (this._context) {
      throw new Error('#context: HttpContext already set.');
    }
    this._context = context;
  }
}
