import { addFactory, addType, addValue, ServicesFeature } from '../app';
import { ServiceBehavior, ServiceType } from '../di';
import { Type, ValueCallback } from '../core';
import { ServiceFactoryWithReturn } from '../di';
import { HttpContext } from '../http';

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
  factory: ServiceFactoryWithReturn<T>,
  dependencies: ServiceType[] = [],
  behavior?: ServiceBehavior,
): ServicesFeature {
  return addFactory(type, factory, dependencies, behavior);
}

/**
 * todo: use instead of global in ../di
 * @param context
 * @param type
 */
function provide<T>(context: HttpContext, type: ServiceType<T>): T;
function provide<T>(context: HttpContext, type: ServiceType<T>, callback: ValueCallback<T>): void;
function provide<T>(type: ServiceType<T>): T;
function provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
function provide(...args: unknown[]): unknown {
  if (args[0] instanceof HttpContext) {
    const type = args[1] as ServiceType;
    return args[2] ? args[0].provide(type, args[2] as ValueCallback<unknown>) : args[0].provide(type);
  }

  throw new Error('not implemented fully');
}
