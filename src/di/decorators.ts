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
import { ServiceReference } from './service-ref';

export function BehaveLike(behavior: ServiceBehavior): ClassDecoratorWithPayload<ServiceBehavior, unknown> {
  return makeClassDecorator(BehaveLike, behavior);
}

export type BehaveLikeDecorator<T> = ClassDecoratorWithPayload<ServiceBehavior, T>;

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

export type ProvideDecorator<T, R = unknown> = ParameterDecoratorWithPayload<ServiceReference<T, R>>;

export function Provide<T>(type: ServiceType<T>): ProvideDecorator<T>;
export function Provide<T, R>(type: ServiceType<T>, callback: MapCallback<T, MaybePromiseLike<R>>): ProvideDecorator<T, R>;
export function Provide(...args: unknown[]): unknown {
  const ref = new ServiceReference(args[0] as ServiceType, args[1] as MapCallback<unknown, unknown>);
  return makeParameterDecorator(Provide, ref);
}
