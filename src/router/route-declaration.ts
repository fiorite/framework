import { HttpCallback, HttpMethod } from '../http';

export class RouteDeclaration {
  private readonly _path: string;

  get path(): string {
    return this._path;
  }

  private readonly _method?: HttpMethod | string;

  get method(): HttpMethod | string | undefined {
    return this._method;
  }

  private readonly _callback: HttpCallback;

  get callback(): HttpCallback {
    return this._callback;
  }

  constructor(object: {
    readonly path: string;
    readonly method?: HttpMethod | string;
    readonly callback: HttpCallback;
  }) {
    this._path = object.path;
    this._method = object.method;
    this._callback = object.callback;
  }

  toString(): string {
    return [this.method || '*', this.path].join(' ');
  }
}
