import { ServiceBehavior } from './service-behavior';
import { ServiceType } from './service-type';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback,
  MaybePromiseLike,
  ParameterDecoratorWithPayload
} from '../core';

export class BehaveLikePayload {
  private readonly _behavior: ServiceBehavior;

  get behavior(): ServiceBehavior {
    return this._behavior;
  }

  constructor(behavior: ServiceBehavior) {
    this._behavior = behavior;
  }
}

export function BehaveLike(behavior: ServiceBehavior): ClassDecoratorWithPayload<BehaveLikePayload, unknown> {
  return makeClassDecorator(BehaveLike, new BehaveLikePayload(behavior));
}

export type BehaveLikeDecorator<T> = ClassDecoratorWithPayload<BehaveLikePayload, T>;

export function Inherited<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Inherited).calledBy(Inherited);
}

export function Singleton<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Singleton).calledBy(Singleton);
}

export function Scoped<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Scoped).calledBy(Scoped);
}

export function Prototype<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Prototype).calledBy(Prototype);
}

export class ProvidePayload<T, R = unknown> {
  private readonly _referTo?: ServiceType<T>;

  get referTo(): ServiceType<T> | undefined {
    return this._referTo;
  }

  private readonly _callback: MapCallback<T, MaybePromiseLike<R>>;

  get callback(): MapCallback<T, MaybePromiseLike<R>> {
    return this._callback;
  }

  constructor(serviceKey?: ServiceType<T>, callback?: MapCallback<T, MaybePromiseLike<R>>) {
    this._referTo = serviceKey;
    this._callback = callback || ((x: T) => x) as unknown as MapCallback<T, MaybePromiseLike<R>>;
  }
}

export type ProvideDecorator<T, R = unknown> = ParameterDecoratorWithPayload<ProvidePayload<T, R>>;

export function Provide<T>(type: ServiceType<T>): ProvideDecorator<T>;
export function Provide<T, R>(type: ServiceType<T>, callback: MapCallback<T, MaybePromiseLike<R>>): ProvideDecorator<T, R>;
export function Provide(...args: unknown[]): unknown {
  const payload = new ProvidePayload(args[0] as ServiceType, args[1] as MapCallback<unknown, unknown>);
  return makeParameterDecorator(Provide, payload);
}
