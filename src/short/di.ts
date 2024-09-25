import { addFactory, addType, addValue, ServicesFeature } from '../app';
import { ServiceBehavior, ServiceType } from '../di';
import { Type } from '../core';
import { ServiceFactoryReturnFunction } from '../di/function';

export function add(value: object): ServicesFeature;
export function add<T>(type: ServiceType<T>, value: T): ServicesFeature;
export function add(...args: unknown[]): ServicesFeature {
  return (addValue as Function)(...args);
}

export function type<T>(type: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function type<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function type(...args: unknown[]): ServicesFeature {
  return (addType as Function)(...args);
}

export function factory<T>(
  type: ServiceType<T>,
  factory: ServiceFactoryReturnFunction<T>,
  dependencies: ServiceType[] = [],
  behaviour?: ServiceBehavior,
): ServicesFeature {
  return addFactory(type, factory, dependencies, behaviour);
}
