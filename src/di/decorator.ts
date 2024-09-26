import { ServiceBehavior } from './behavior';
import { ServiceType } from './type';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback,
  MaybePromise,
  ParameterDecoratorWithPayload
} from '../core';

export class BehaveLikePayload {
  private readonly _behaviour: ServiceBehavior;

  get behaviour(): ServiceBehavior {
    return this._behaviour;
  }

  constructor(behaviour: ServiceBehavior) {
    this._behaviour = behaviour;
  }
}

export function BehaveLike(behaviour: ServiceBehavior): ClassDecoratorWithPayload<BehaveLikePayload, unknown> {
  return makeClassDecorator(BehaveLike, new BehaveLikePayload(behaviour));
}

export type BehaveLikeDecorator<T> = ClassDecoratorWithPayload<BehaveLikePayload, T>;

export function Inherited<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Inherited).calledBy(Inherited);
}

export function Singleton<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Inherited).calledBy(Inherited);
}

export function Scoped<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Inherited).calledBy(Inherited);
}

export function Prototype<T>(): BehaveLikeDecorator<T> {
  return BehaveLike(ServiceBehavior.Inherited).calledBy(Inherited);
}

export class ProvidePayload<T, R = unknown> {
  private readonly _referTo?: ServiceType<T>;

  get referTo(): ServiceType<T> | undefined {
    return this._referTo;
  }

  private readonly _callback: MapCallback<T, MaybePromise<R>>;

  get callback(): MapCallback<T, MaybePromise<R>> {
    return this._callback;
  }

  constructor(serviceKey?: ServiceType<T>, callback?: MapCallback<T, MaybePromise<R>>) {
    this._referTo = serviceKey;
    this._callback = callback || ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }
}

export type ProvideDecorator<T, R = unknown> = ParameterDecoratorWithPayload<ProvidePayload<T, R>>;

export function Provide(): ClassDecoratorWithPayload<void>;
export function Provide<T>(type: ServiceType<T>): ProvideDecorator<T>;
export function Provide<T, R>(type: ServiceType<T>, callback: MapCallback<T, MaybePromise<R>>): ProvideDecorator<T, R>;
export function Provide(...args: unknown[]): unknown {
  if (!args.length) {
    return makeClassDecorator(Provide, void 0);
  }

  const payload = new ProvidePayload(args[0] as ServiceType, args[1] as MapCallback<unknown, unknown>);
  return makeParameterDecorator(Provide, payload);
}
