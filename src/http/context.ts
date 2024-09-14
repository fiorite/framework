import type { IncomingMessage, ServerResponse } from 'node:http';
import { MaybeSyncProvideFunction, MaybeSyncServiceProvider, ServiceProvideFunction } from '../service';

export class HttpContext<
  TRequest extends IncomingMessage = IncomingMessage,
  TResponse extends ServerResponse = ServerResponse,
> {
  private readonly _request: TRequest;

  get request(): TRequest {
    return this._request;
  }

  private readonly _response: TResponse;

  get response(): TResponse {
    return this._response;
  }

  private readonly _provide: MaybeSyncProvideFunction;

  get provide(): MaybeSyncProvideFunction {
    return this._provide;
  }

  constructor(request: TRequest, response: TResponse, provide: MaybeSyncProvideFunction) {
    this._request = request;
    this._response = response;
    this._provide = provide;
  }
}

export class HttpContextHost<
  TRequest extends IncomingMessage = IncomingMessage,
  TResponse extends ServerResponse = ServerResponse,
> {
  private _context?: HttpContext<TRequest, TResponse>;

  get context(): HttpContext<TRequest, TResponse> | unknown {
    return this._context;
  }

  useContext(context: HttpContext<TRequest, TResponse>): void {
    if (this._context) {
      throw new Error('Http context already set.');
    }
    this._context = context;
  }
}
