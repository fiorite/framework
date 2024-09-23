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

export function addType<T>(type: Type<T>, behaviour?: ServiceBehavior): ServicesFeature;
export function addType<T>(type: ServiceType<T>, actual: Type<T>, behaviour?: ServiceBehavior): ServicesFeature;
export function addType(...args: unknown[]): ServicesFeature {
  return new ServicesFeature([(ServiceDescriptor.type as Function)(...args)]);
}

export function addValue(value: object): ServicesFeature;
export function addValue<T>(type: ServiceType<T>, value: T): ServicesFeature;
export function addValue(...args: unknown[]): ServicesFeature {
  return new ServicesFeature([(ServiceDescriptor.value as Function)(...args)]);
}

export function addFactory<T>(
  type: ServiceType<T>,
  factory: ServiceFactoryReturnFunction<T>,
  dependencies: ServiceType[] = [],
  behaviour?: ServiceBehavior,
): ServicesFeature {
  return new ServicesFeature([ServiceDescriptor.factory(type, factory, dependencies, behaviour)]);
}

// todo: add behavior ones
