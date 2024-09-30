import { RoutePath } from './path';
import { RadixMap } from './radix';
import { HttpCallback, HttpMethod, HttpRequest } from '../http';
import { RouteDescriptor } from './descriptor';
import { NullPathSegment, DynamicPathSegment, RoutePathSegment, StaticPathSegment, CatchAllPathSegment } from './segment';
import { RouteCallback } from './callback';

interface RouteMatchResult {
  readonly params: Record<string, unknown>;
  readonly path: string;
  readonly data: HttpCallback[];
  // readonly callback: unknown;
}

export interface RoutePathMatcher {
  match(path: string): RouteMatchResult | undefined;
}

export class CompositeRoutePathMatcher implements RoutePathMatcher {
  get size(): number {
    return this.array.length;
  }

  constructor(readonly array: RoutePathMatcher[]) {
  }

  match(path: string): RouteMatchResult | undefined {
    for (const matcher of this.array) {
      const result = matcher.match(path);
      if (undefined !== result) {
        return result;
      }
    }
    return;
  }
}

export class RouteComponentChainMatcher implements RoutePathMatcher {
  constructor(readonly x: RoutePathMatcher, readonly y: CompositeRoutePathMatcher) {
  }

  match(path: string): RouteMatchResult | undefined {
    const resultX = this.x.match(path);
    if (undefined === resultX) {
      return undefined;
    }
    if (!this.y.size && !resultX.path.length) {
      return resultX;
    }
    const resultY = this.y.match(resultX.path);
    if (undefined === resultY) {
      return undefined;
    }
    return {
      path: resultY.path,
      params: {
        ...resultX.params,
        ...resultY.params,
      },
      data: [...resultY.data],
    };
  }
}

export class RadixRouteComponentMatcher implements RoutePathMatcher {
  private _data = new RadixMap<RoutePathMatcher>();

  constructor(array: StaticRouteComponentMatcher[]) {
    for (const staticMatcher of array) {
      this._data.set(staticMatcher.component.value, staticMatcher);
    }
  }

  match(path: string): RouteMatchResult | undefined {
    for (const result of this._data.walk(path)) {
      const match = result.payload.match(path);
      if (undefined !== match) {
        return match;
      }
    }
    return undefined;
  }
}

export class StaticRouteComponentMatcher implements RoutePathMatcher {
  get component(): StaticPathSegment {
    return this._component;
  }

  constructor(private _component: StaticPathSegment, readonly payload: RouteCallback[]) {
  }

  match(path: string): RouteMatchResult | undefined {
    if (path.startsWith(this._component.value)) {
      return {
        path: path.substring(this._component.value.length),
        params: {},
        data: [...this.payload],
      };
    }
    return;
  }
}

export class DynamicRouteComponentMatcher implements RoutePathMatcher {
  constructor(private _component: DynamicPathSegment, readonly payload: RouteCallback[]) {
  }

  match(path: string): RouteMatchResult | undefined {
    let query = path;
    const slash = path.indexOf('/');
    if (slash > -1) {
      query = path.substring(0, slash);
    }

    const length = this._component.tryLength(query);

    if (length > 0) { // match
      const term = path.substring(0, length);
      const value = this._component.match(term);
      if (undefined === value) {
        return undefined;
      }
      return {
        path: path.substring(length),
        params: { [this._component.name]: value },
        data: [...this.payload],
      };
    }
    return undefined;
  }
}

class ComponentNode {
  private _data: RouteCallback[] = [];

  constructor(
    readonly component: RoutePathSegment,
    readonly children: ComponentNode[] = []
  ) {
  }

  push(payload: RouteCallback): void {
    this._data.push(payload);
  }

  wrap(): RoutePathMatcher {
    let statics: StaticRouteComponentMatcher[] = [];
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
    let matcher: RoutePathMatcher;
    if (this.component instanceof StaticPathSegment) {
      matcher = new StaticRouteComponentMatcher(this.component, this._data);
    } else if (this.component instanceof DynamicPathSegment) {
      matcher = new DynamicRouteComponentMatcher(this.component, this._data);
    } else if (this.component instanceof NullPathSegment) {
      return composite;
    } else {
      throw new Error('the rest is not implemented');
    }

    return new RouteComponentChainMatcher(matcher, composite);
  }
}

interface InnerRouteDeclaration {
  readonly original: string;
  readonly path: RoutePath;
  readonly method?: HttpMethod | string;
  readonly callback: RouteCallback;
}

/** todo: rewrite to make it mutable */
export class RouteMatcher {
  private _methodMatcher!: Map<HttpMethod | string | undefined, RoutePathMatcher>;

  constructor(descriptors: Iterable<RouteDescriptor>) {
    this._mapMatcher(descriptors);
  }

  rebuild(descriptors: Iterable<RouteDescriptor>): void {
    this._mapMatcher(descriptors);
  }

  private _mapMatcher(descriptors: Iterable<RouteDescriptor>): void {
    const routes: InnerRouteDeclaration[] = Array.from(descriptors).map(x => {
      // const components = segmentRoutePath(x.path);

      const path = new RoutePath(x.path);
      // const path = components.length ? segmentRoutePath(x.path).reduce((result, segment) => {
      //   const slash = new StaticRouteComponent('/');
      //   const queue = [slash, ...segment];
      //   while (queue.length) {
      //     const component = queue.shift()!;
      //     if (
      //       component instanceof StaticRouteComponent &&
      //       result.length &&
      //       result[result.length - 1] instanceof StaticRouteComponent
      //     ) {
      //       const merged = new StaticRouteComponent([result[result.length - 1].original, component.original].join(''));
      //       result.splice(result.length - 1, 1, merged);
      //     } else {
      //       result.push(component);
      //     }
      //   }
      //   return result;
      // }, [] as RouteComponent[]) : [new StaticRouteComponent('/')];

      return {
        original: x.path,
        path,
        method: x.method,
        callback: x.callback,
      };
    });

    const methodMap = routes.reduce((result, route) => {
      if (result.has(route.method)) {
        result.get(route.method)!.push(route);
      } else {
        result.set(route.method, [route]);
      }

      return result;
    }, new Map<HttpMethod | string | undefined, InnerRouteDeclaration[]>);

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
              node.push(route.callback);
            }
          }
        }


        return [method, root.wrap()];
      }),
    );
  }

  match(request: HttpRequest): RouteMatchResult | undefined {
    if (this._methodMatcher.has(request.method)) {
      const result = this._methodMatcher.get(request.method)!.match(request.url!.pathname);
      if (undefined !== result && !result.path.length) { // if path has not processed part
        return result;
      }
    }

    if (this._methodMatcher.has(undefined)) {
      const result = this._methodMatcher.get(undefined)!.match(request.url!.pathname);
      if (undefined !== result && !result.path.length) { // if path has not processed part
        return result;
      }
    }

    return undefined;
  }
}
