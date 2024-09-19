import { MaybeSyncProvideFunction } from '../service';
import { HttpRequest } from './request';
import { HttpResponse } from './response';

export class HttpContext {
  private readonly _request: HttpRequest;

  get request(): HttpRequest {
    return this._request;
  }

  private readonly _response: HttpResponse;

  get response(): HttpResponse {
    return this._response;
  }

  private readonly _provide: MaybeSyncProvideFunction;

  get provide(): MaybeSyncProvideFunction {
    return this._provide;
  }

  constructor(request: HttpRequest, response: HttpResponse, provide: MaybeSyncProvideFunction) {
    this._request = request;
    this._response = response;
    this._provide = provide;
  }
}

export class HttpContextHost {
  private _context?: HttpContext;

  get context(): HttpContext | undefined {
    return this._context;
  }

  bindContext(context: HttpContext): void {
    if (this._context) {
      throw new Error('#context: HttpContext already set.');
    }
    this._context = context;
  }
}
