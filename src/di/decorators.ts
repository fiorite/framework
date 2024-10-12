import { ServiceBehavior } from './service-behavior';
import { ClassDecoratorWithPayload, makeClassDecorator } from '../core';

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
