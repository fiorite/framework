import { RadixMap } from './radix';
import { DynamicPathSegment, StaticPathSegment } from './route-path-segment';

export interface RoutePathMatchResult<TPayload> {
  readonly params: Record<string, unknown>;

  /**
   * Communicates unprocessed path.
   */
  readonly substring: string;
  readonly payload?: TPayload;
}

export interface RoutePathMatcher<TPayload> {
  match(path: string): RoutePathMatchResult<TPayload> | undefined;
}

export class CompositeRoutePathMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  get size(): number {
    return this.array.length;
  }

  constructor(readonly array: RoutePathMatcher<TPayload>[]) {
  }

  match(path: string): RoutePathMatchResult<TPayload> | undefined {
    for (const matcher of this.array) {
      const result = matcher.match(path);
      if (undefined !== result) {
        return result;
      }
    }
    return;
  }
}

export class RouteComponentChainMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  constructor(readonly x: RoutePathMatcher<TPayload>, readonly y: CompositeRoutePathMatcher<TPayload>) {
  }

  match(path: string): RoutePathMatchResult<TPayload> | undefined {
    const resultX = this.x.match(path);
    if (undefined === resultX) {
      return undefined;
    }
    if (!this.y.size && !resultX.substring.length) {
      return resultX;
    }
    const resultY = this.y.match(resultX.substring);
    if (undefined === resultY) {
      return undefined;
    }
    return {
      substring: resultY.substring,
      params: {
        ...resultX.params,
        ...resultY.params,
      },
      payload: resultY.payload,
    };
  }
}

export class RadixRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  private _data = new RadixMap<RoutePathMatcher<TPayload>>();

  constructor(array: StaticRouteComponentMatcher<TPayload>[]) {
    for (const staticMatcher of array) {
      this._data.set(staticMatcher.component.value, staticMatcher);
    }
  }

  match(path: string): RoutePathMatchResult<TPayload> | undefined {
    for (const result of this._data.walk(path)) {
      const match = result.payload.match(path);
      if (undefined !== match) {
        return match;
      }
    }
    return undefined;
  }
}

export class StaticRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  get component(): StaticPathSegment {
    return this._component;
  }

  constructor(private _component: StaticPathSegment, readonly payload?: TPayload) {
  }

  match(path: string):  RoutePathMatchResult<TPayload> | undefined {
    if (path.startsWith(this._component.value)) {
      return {
        substring: path.substring(this._component.value.length),
        params: {},
        payload: this.payload,
      };
    }
    return;
  }
}

export class DynamicRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  constructor(private _component: DynamicPathSegment, readonly payload?: TPayload) {
  }

  match(path: string): RoutePathMatchResult<TPayload> | undefined {
    let substring = path;
    const slash = path.indexOf('/');
    if (slash > -1) {
      substring = path.substring(0, slash);
    }

    const length = this._component.tryLength(substring);

    if (length > 0) { // match
      const term = path.substring(0, length);
      const value = this._component.match(term);
      if (undefined === value) {
        return undefined;
      }
      return {
        substring: path.substring(length),
        params: { [this._component.name]: value },
        payload: this.payload,
      };
    }
    return undefined;
  }
}
