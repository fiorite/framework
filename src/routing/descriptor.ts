import { HttpMethod } from '../http';
import { RouteCallback } from './callback';

export class RouteDescriptor {
  private readonly _path: string;

  get path(): string {
    return this._path;
  }

  private readonly _method?: HttpMethod | string;

  get method(): HttpMethod | string | undefined {
    return this._method;
  }

  private readonly _callback: RouteCallback;

  get callback(): RouteCallback {
    return this._callback;
  }

  constructor(object: {
    readonly path: string;
    readonly method?: HttpMethod | string;
    readonly callback: RouteCallback;
  }) {
    this._path = object.path;
    this._method = object.method;
    this._callback = object.callback;
  }

  toString(): string {
    return [this.method || '*', this.path].join(' ');
  }
}
