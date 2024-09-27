import { ApplicationFeature } from './feature';
import { ServiceBehavior, ServiceDescriptor, ServiceSet, ServiceType } from '../di';
import { Type } from '../core';
import { ServiceFactoryReturnFunction } from '../di/function';

export class ServicesFeature implements ApplicationFeature {
  constructor(readonly values: Iterable<ServiceDescriptor>) {
  }

  configureServices(serviceSet: ServiceSet) {
    serviceSet.addAll(this.values);
  }
}

export function addType<T>(type: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function addType<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServicesFeature;
export function addType(...args: unknown[]): ServicesFeature {
  return new ServicesFeature([(ServiceDescriptor.fromType as Function)(...args)]);
}

export function addValue(value: object): ServicesFeature;
export function addValue<T>(type: ServiceType<T>, value: T): ServicesFeature;
export function addValue(...args: unknown[]): ServicesFeature {
  return new ServicesFeature([(ServiceDescriptor.fromValue as Function)(...args)]);
}

export function addFactory<T>(
  type: ServiceType<T>,
  factory: ServiceFactoryReturnFunction<T>,
  dependencies: ServiceType[] = [],
  behavior?: ServiceBehavior,
): ServicesFeature {
  return new ServicesFeature([ServiceDescriptor.fromFactory(type, factory, dependencies, behavior)]);
}

// todo: add behavior ones
