import { ServiceProvider } from '../di';
import { HttpRequest } from './request';
import { HttpResponse } from './response';
import { Context, ValueCallback, VoidCallback } from '../core';


export class HttpContext extends Context {
  private readonly _request: HttpRequest;

  get request(): HttpRequest {
    return this._request;
  }

  private readonly _response: HttpResponse;

  get response(): HttpResponse {
    return this._response;
  }

  private readonly _provider?: ServiceProvider;

  get provider(): ServiceProvider {
    if (this._provider) {

    }
    return this.get(ServiceProvider);
  }

  // private _direction: 'request' | 'response';

  constructor(request: HttpRequest, response: HttpResponse, provider?: ServiceProvider | undefined) {
    super([[HttpRequest, request], [HttpResponse, response]]);
    this._request = request;
    this._response = response;
    if (provider) {
      this._provider = provider;
      this.set(ServiceProvider, provider);
    }
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
