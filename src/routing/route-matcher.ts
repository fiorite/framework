import { HttpCallback, HttpMethod, HttpRequest } from '../http';
import { RouteDescriptor } from './route-descriptor';
import { DynamicPathSegment, NullPathSegment, RoutePathSegment, StaticPathSegment } from './route-path-segment';
import {
  CompositeRoutePathMatcher,
  DynamicRouteComponentMatcher,
  RadixRouteComponentMatcher,
  RouteComponentChainMatcher,
  RoutePathMatcher,
  StaticRouteComponentMatcher
} from './route-path-matcher';
import { SetWithInnerKey } from '../core';
import { forEach } from '../iterable';

export class ComponentNode {
  // private _data: RouteCallback[] = [];
  private _payload?: RouteDescriptor;

  constructor(
    readonly component: RoutePathSegment,
    readonly children: ComponentNode[] = []
  ) {
  }

  push(payload: RouteDescriptor): void {
    // this._data.push(payload);
    this._payload = payload;
  }

  wrap(): RoutePathMatcher<RouteDescriptor> {
    let statics: StaticRouteComponentMatcher<RouteDescriptor>[] = [];
    let array = [];
    this.children.map(child => child.wrap()).forEach(matcher => {
      if (matcher instanceof StaticRouteComponentMatcher) {
        statics.push(matcher);
      } else {
        array.push(matcher); // dynamic or catch
      }
    });
    if (statics.length) {
      statics.length > 1 ? array.unshift(
        new RadixRouteComponentMatcher(statics)
      ) : array.unshift(statics[0]);
    }
    const composite = new CompositeRoutePathMatcher(array);
    let matcher: RoutePathMatcher<RouteDescriptor>;
    if (this.component instanceof StaticPathSegment) {
      matcher = new StaticRouteComponentMatcher(this.component, this._payload);
    } else if (this.component instanceof DynamicPathSegment) {
      matcher = new DynamicRouteComponentMatcher(this.component, this._payload);
    } else if (this.component instanceof NullPathSegment) {
      return composite;
    } else {
      throw new Error('the rest is not implemented');
    }

    return new RouteComponentChainMatcher(matcher, composite);
  }
}

export interface RouteMatchResult {
  readonly params: Record<string, unknown>;
  readonly descriptor: RouteDescriptor;
}

/** todo: optimize matcher builder */
export class RouteMatcher extends SetWithInnerKey<RouteDescriptor, string> {
  private _methodMatcher!: Map<HttpMethod | string | undefined, RoutePathMatcher<RouteDescriptor>>;

  constructor(descriptors: Iterable<RouteDescriptor>) {
    const routeToString = (route: RouteDescriptor) => route.toString();
    super(routeToString);
    forEach<RouteDescriptor>(route => super.add(route))(descriptors); // use parent add to avoid map matcher of each all
    this._mapMatcher();
  }

  private _mapMatcher(routes: Iterable<RouteDescriptor> = this): void {
    const methodMap = Array.from(routes).reduce((result, route) => {
      if (result.has(route.method)) {
        result.get(route.method)!.push(route);
      } else {
        result.set(route.method, [route]);
      }

      return result;
    }, new Map<HttpMethod | string | undefined, RouteDescriptor[]>);

    this._methodMatcher = new Map(
      Array.from(methodMap.entries()).map(([method, routes]) => {
        const root = new ComponentNode(NullPathSegment.instance);

        const queue = [...routes];
        while (queue.length) {
          const route = queue.shift()!;

          let node: ComponentNode | undefined = undefined;
          let depth = 0;
          while (depth < route.path.length) {
            const array: ComponentNode[] = (node ? node.children : root.children);
            const index: number = array.findIndex(x => x.component.equals(route.path[depth]));
            if (index > -1) {
              node = array[index];
            } else {
              node = new ComponentNode(route.path[depth]);
              array.push(node);
            }
            depth++;
            if (depth >= route.path.length) {
              node.push(route);
            }
          }
        }


        return [method, root.wrap()];
      }),
    );
  }

  override add(value: RouteDescriptor): this {
    if (this.has(value)) {
      throw new Error('route "' + value.toString() + '" is already added.');
    }

    super.add(value);
    this._mapMatcher();
    return this;
  }

  override clear(): void {
    super.clear();
    this._mapMatcher();
  }

  override delete(value: RouteDescriptor): boolean {
    if (super.delete(value)) {
      this._mapMatcher();
      return true;
    }

    return false;
  }

  match(path: string, method?: HttpMethod | string): RouteMatchResult | undefined {
    if (this._methodMatcher.has(method)) {
      const result = this._methodMatcher.get(method)!.match(path);
      if (undefined !== result && !result.substring.length && undefined !== result.payload) { // if path has not processed part
        return { params: result.params, descriptor: result.payload };
      }
    }

    if (this._methodMatcher.has(undefined)) {
      const result = this._methodMatcher.get(undefined)!.match(path);
      if (undefined !== result && !result.substring.length && undefined !== result.payload) { // if path has not processed part
        return { params: result.params, descriptor: result.payload };
      }
    }

    return undefined;
  }

  map(path: string, callback: HttpCallback): this;
  map(method: HttpMethod | string, path: string, callback: HttpCallback): this;
  map(...args: unknown[]): this {
    if (args.length === 2) {
      const [path, callback] = args as [string, HttpCallback];
      const route = new RouteDescriptor({ path, callback });
      return this.add(route);
    }

    if (args.length === 3) {
      const [method, path, callback] = args as [HttpMethod | string, string, HttpCallback];
      const route = new RouteDescriptor({ path, method, callback });
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
