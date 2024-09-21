import { CustomSet } from '../core';
import { RouteDeclaration } from './declaration';
import { HttpCallback, HttpMethod } from '../http';

export class RouteSet extends CustomSet<RouteDeclaration, string> {
  get [Symbol.toStringTag](): string {
    return 'RouteSet';
  }

  constructor() {
    const routeToString = (route: RouteDeclaration) => route.toString();
    super(routeToString);
  }

  override add(value: RouteDeclaration): this {
    if (this.has(value)) {
      throw new Error('route "'+ value.toString() +'" is already added.');
    }
    return super.add(value);
  }

  mapProject(): void {
    throw new Error('not implemented however, should be all from current project');
    // todo: read
  }

  map(path: string, callback: HttpCallback): this;
  map(method: HttpMethod | string, path: string, callback: HttpCallback): this;
  map(...args: unknown[]): this {
    if (args.length === 2) {
      const [path, callback] = args as [string, HttpCallback];
      const route = new RouteDeclaration({ path, callback });
      return this.add(route);
    }

    if (args.length === 3) {
      const [method, path, callback] = args as [HttpMethod | string, string, HttpCallback];
      const route = new RouteDeclaration({ path, method, callback });
      return this.add(route);
    }

    throw new Error('wrong number of args. see overloads.');
  }

  mapGet(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Get, path, callback);
  }

  mapHead(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Head, path, callback);
  }

  mapPost(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Post, path, callback);
  }

  mapPut(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Put, path, callback);
  }

  mapDelete(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Delete, path, callback);
  }

  mapConnect(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Connect, path, callback);
  }

  mapOptions(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Options, path, callback);
  }

  mapTrace(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Trace, path, callback);
  }

  mapPatch(path: string, callback: HttpCallback): this {
    return this.map(HttpMethod.Patch, path, callback);
  }
}
