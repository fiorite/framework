import { DynamicPathSegment, StaticPathSegment } from './route-path-segment';
import { RadixMap } from '../core';

export interface RoutePathMatchResult<TPayload> {
  readonly params: Record<string, unknown>;

  /**
   * Communicates unprocessed path.
   */
  readonly substring: string;
  readonly payload?: TPayload;
}

export interface RoutePathMatcher<TPayload> {
  match(path: string): Iterable<RoutePathMatchResult<TPayload>>;
}

export class CompositeRoutePathMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  constructor(readonly array: RoutePathMatcher<TPayload>[]) {
  }

  * match(path: string): Iterable<RoutePathMatchResult<TPayload>> {
    for (const matcher of this.array) {
      for (const result of matcher.match(path)) {
        yield result;
      }
    }
  }
}

export class RouteComponentChainMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  constructor(readonly x: RoutePathMatcher<TPayload>, readonly y: CompositeRoutePathMatcher<TPayload>) {
  }

  * match(path: string): Iterable<RoutePathMatchResult<TPayload>> {
    for (const resultX of this.x.match(path)) {
      // if (!this.y.size && !resultX.substring.length) {
      //   yield resultX;
      // }
      if (resultX.substring.length) {
        for (const resultY of this.y.match(resultX.substring)) {
          yield {
            substring: resultY.substring,
            params: {
              ...resultX.params,
              ...resultY.params,
            },
            payload: resultY.payload,
          };
        }
      } else {
        yield resultX;
      }
    }
  }
}

export class RadixRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  private _data = new RadixMap<RoutePathMatcher<TPayload>>();

  constructor(array: StaticRouteComponentMatcher<TPayload>[]) {
    for (const staticMatcher of array) {
      this._data.set(staticMatcher.component.value, staticMatcher);
    }
  }

  * match(path: string): Iterable<RoutePathMatchResult<TPayload>> {
    for (const result of this._data.walk(path)) {
      for (const result2 of result.payload.match(path)) {
        yield result2;
      }
    }
  }
}

export class StaticRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  get component(): StaticPathSegment {
    return this._component;
  }

  constructor(private _component: StaticPathSegment, readonly payload?: TPayload) {
  }

  * match(path: string): Iterable<RoutePathMatchResult<TPayload>> {
    if (path.startsWith(this._component.value)) {
      yield {
        substring: path.substring(this._component.value.length),
        params: {},
        payload: this.payload,
      };
    }
  }
}

export class DynamicRouteComponentMatcher<TPayload> implements RoutePathMatcher<TPayload> {
  constructor(private _component: DynamicPathSegment, readonly payload?: TPayload) {
  }

  * match(path: string): Iterable<RoutePathMatchResult<TPayload>> {
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
        return;
      }

      yield {
        substring: path.substring(length),
        params: { [this._component.name]: value },
        payload: this.payload,
      };
    }
  }
}
