import { AbstractType, Type } from './type';
import { MaybeOptional, OptionalMarker } from './optional';

/**
 * Lack of creativity...
 */
export type ContextThing<T = unknown> = string | symbol | Type<T> | AbstractType<T>;

export class ThingNotFoundError implements Error {
  constructor(thing: ContextThing) {

  }
}

/**
 * Centralized instance for any specific context which is the storage for features at the same time.
 */
export abstract class Context {
  private readonly _things: Map<unknown, unknown>;

  protected constructor(things?: readonly (readonly [unknown, unknown])[]) {
    this._things = new Map<unknown, unknown>(things);
  }

  has(thing: ContextThing): boolean {
    return this._things.has(thing);
  }

  get<T>(thing: OptionalMarker<ContextThing<T>>): T | undefined;
  get<T>(thing: ContextThing<T>): T;
  get<T>(arg: MaybeOptional<ContextThing<T>>) {
    const [thing, optional] = MaybeOptional.spread(arg);
    if (!this._things.has(thing)) {
      if (optional) {
        return undefined;
      }

      throw new Error('Context thing was not found.');
    }
    return this._things.get(thing)!;
  }

  set<T>(thing: ContextThing<T>, value: T): this {
    this._things.set(thing, value);
    return this;
  }

  delete(thing: ContextThing): boolean {
    return this._things.delete(thing);
  }

  clear(): void {
    this._things.clear();
  }
}
