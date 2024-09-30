import { HttpMethod } from '../http';
import { RouteCallback } from './callback';
import { RoutePath } from './route-path';

export class RouteDescriptor {
  private readonly _path: RoutePath;

  get path(): RoutePath {
    return this._path;
  }

  private readonly _callback: RouteCallback;

  get callback(): RouteCallback {
    return this._callback;
  }

  private readonly _method?: HttpMethod | string;

  get method(): HttpMethod | string | undefined {
    return this._method;
  }

  constructor(object: {
    readonly path: RoutePath | string;
    readonly callback: RouteCallback;
    readonly method?: HttpMethod | string;
  }) {
    this._path = object.path instanceof RoutePath ? object.path : new RoutePath(object.path);
    this._method = object.method;
    this._callback = object.callback;
  }

  toString(): string {
    return [this.method || '*', this.path.value].join(' ');
  }
}
