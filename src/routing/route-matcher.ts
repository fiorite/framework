import { HttpMethod } from '../http';
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
import { RouteSet } from './route-set';
import { RouteActionFunction } from './route-action';

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
export class RouteMatcher {
  private _pathMatcher!: RoutePathMatcher<RouteDescriptor>;

  private readonly _routeSet: RouteSet;

  get routeSet(): RouteSet {
    return this._routeSet;
  }

  get add() {
    return (method: HttpMethod | string, path: string, action: RouteActionFunction) => {
      this._routeSet.add(method, path, action);
      return this;
    }
  }

  get all(): (path: string, action: RouteActionFunction) => this {
    return (path, action) => {
      this._routeSet.add(path, action);
      return this;
    }
  }

  get get(): (path: string, action: RouteActionFunction) => this {
    return (path, action) => {
      this._routeSet.add(HttpMethod.Get, path, action);
      return this;
    }
  }

  constructor(descriptors: Iterable<RouteDescriptor>) {
    this._routeSet = new RouteSet(descriptors, () => this._mapMatcher());
    this._mapMatcher();
  }

  private _mapMatcher(): void {
    const root = new ComponentNode(NullPathSegment.instance);

    const queue = [...this._routeSet];
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

    this._pathMatcher = root.wrap();
  }

  * match(path: string): Iterable<RouteMatchResult> {
    for (const result of this._pathMatcher.match(path)) {
      if (!result.substring.length && undefined !== result.payload) { // if path has not processed part
        yield { params: result.params, descriptor: result.payload };
      }
    }
  }

  head(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Head, path, action);
  }

  post(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Post, path, action);
  }

  put(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Put, path, action);
  }

  delete(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Delete, path, action);
  }

  connect(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Connect, path, action);
  }

  options(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Options, path, action);
  }

  trace(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Trace, path, action);
  }

  patch(path: string, action: RouteActionFunction): this {
    return this.add(HttpMethod.Patch, path, action);
  }
}
