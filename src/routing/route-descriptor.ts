import { HttpMethod } from '../http';
import { RoutePath } from './route-path';
import { ReflectedAction, RouteActionFunction } from './route-action';

export class RouteDescriptor {
  private readonly _path: RoutePath;

  get path(): RoutePath {
    return this._path;
  }

  private readonly _action: RouteActionFunction;

  get action(): RouteActionFunction {
    return this._action;
  }

  private readonly _httpMethod?: HttpMethod | string;

  get httpMethod(): HttpMethod | string | undefined {
    return this._httpMethod;
  }

  constructor(path: RoutePath | string, action: RouteActionFunction, httpMethod?: HttpMethod | string) {
    this._path = path instanceof RoutePath ? path : new RoutePath(path);
    this._action = action;
    this._httpMethod = httpMethod;
  }

  toString(extended = false): string {
    let actionString: string;
    if (this.action instanceof ReflectedAction) {
      actionString = this.action.type.name + '#' + this.action.propertyKey.toString();
    } else {
      actionString = '(anonymous function)';
    }

    return !extended ?
      [this.httpMethod || '*', this.path.value/*, ' => '+actionString*/].join(' ') :
      [this.httpMethod || '*', this.path.value, ' => '+actionString].join(' ');
  }
}
