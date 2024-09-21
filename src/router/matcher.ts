import {
  DynamicPathComponent,
  NullRouteComponent,
  RoutePathComponent,
  segmentRoutePath,
  StaticPathComponent
} from './segment';
import { RadixMap } from './radix';
import { HttpCallback, HttpContext, HttpMethod, HttpRequest } from '../http';
import { MaybePromise } from '../core';
import { RouteDeclaration } from './route-declaration';

interface RouteMatchResult {
  readonly params: Record<string, unknown>;
  readonly path: string;
  readonly data: HttpCallback[];
  // readonly callback: unknown;
}

export interface RouteMatcher {
  match(request: HttpRequest): RouteMatchResult | undefined;
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

export class MainRouteMatcher implements RouteMatcher {
  constructor(private _methodMatcher: Map<HttpMethod | string | undefined, RoutePathMatcher>) {
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

export class RadixRouteComponentMatcher implements RoutePathMatcher {
  private _data = new RadixMap<RoutePathMatcher>();

  constructor(array: StaticRouteComponentMatcher[]) {
    for (const staticMatcher of array) {
      this._data.set(staticMatcher.component.original, staticMatcher);
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
  get component(): StaticPathComponent {
    return this._component;
  }

  constructor(private _component: StaticPathComponent, readonly payload: ((context: HttpContext) => MaybePromise<unknown>)[]) {
  }

  match(path: string): RouteMatchResult | undefined {
    if (path.startsWith(this._component.original)) {
      return {
        path: path.substring(this._component.original.length),
        params: {},
        data: [...this.payload],
      };
    }
    return;
  }
}

export class DynamicRouteComponentMatcher implements RoutePathMatcher {
  constructor(private _component: DynamicPathComponent, readonly payload: ((context: HttpContext) => MaybePromise<unknown>)[]) {
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
  private _data: ((context: HttpContext) => MaybePromise<unknown>)[] = [];

  constructor(
    readonly component: RoutePathComponent,
    readonly children: ComponentNode[] = []
  ) {
  }

  push(payload: ((context: HttpContext) => MaybePromise<unknown>)): void {
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
    if (this.component instanceof StaticPathComponent) {
      matcher = new StaticRouteComponentMatcher(this.component, this._data);
    } else if (this.component instanceof DynamicPathComponent) {
      matcher = new DynamicRouteComponentMatcher(this.component, this._data);
    } else if (this.component instanceof NullRouteComponent) {
      return composite;
    } else {
      throw new Error('the rest is not implemented');
    }

    return new RouteComponentChainMatcher(matcher, composite);
  }
}

interface InnerRouteDeclaration {
  readonly original: string;
  readonly path: RoutePathComponent[];
  readonly method?: HttpMethod | string;
  readonly callback: (context: HttpContext) => unknown;
}

export function makeRouter(declarations: Iterable<RouteDeclaration>): RouteMatcher {
  const routes: InnerRouteDeclaration[] = Array.from(declarations).map(x => {
    const path = segmentRoutePath(x.path).reduce((result, segment) => {
      const slash = new StaticPathComponent('/');
      const queue = [slash, ...segment];
      while (queue.length) {
        const component = queue.shift()!;
        if (
          component instanceof StaticPathComponent &&
          result.length &&
          result[result.length - 1] instanceof StaticPathComponent
        ) {
          const merged = new StaticPathComponent([result[result.length - 1].original, component.original].join(''));
          result.splice(result.length - 1, 1, merged);
        } else {
          result.push(component);
        }
      }
      return result;
    }, [] as RoutePathComponent[]);

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


  const methodMap2 = new Map(
    Array.from(methodMap.entries()).map(([method, routes]) => {
      const root = new ComponentNode(new NullRouteComponent());

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
    })
  );

  return new MainRouteMatcher(methodMap2);
}
