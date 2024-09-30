import { ApplicationConfigureServicesFunction, ApplicationFeature } from './feature';
import { ServiceBehavior, ServiceFactoryWithReturnFunction, ServiceSet, ServiceType } from '../di';
import { AbstractType, DecoratorOuterFunction, Type } from '../core';

export class ServiceAddFeature implements ApplicationFeature {
  private readonly _callback: ApplicationConfigureServicesFunction;

  get callback(): ApplicationConfigureServicesFunction {
    return this._callback;
  }

  constructor(callback: ApplicationConfigureServicesFunction) {
    this._callback = callback;
  }

  configureServices(serviceSet: ServiceSet) {
    this.callback(serviceSet);
  }
}

export function addType<T>(type: Type<T>, behavior?: ServiceBehavior): ServiceAddFeature;
export function addType<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServiceAddFeature;
export function addType(...args: unknown[]): ServiceAddFeature {
  return new ServiceAddFeature(serviceSet => (serviceSet.addType as Function)(...args));
}

export function addValue(value: object): ServiceAddFeature;
export function addValue<T>(type: ServiceType<T>, value: T): ServiceAddFeature;
export function addValue(...args: unknown[]): ServiceAddFeature {
  return new ServiceAddFeature(serviceSet => (serviceSet.addValue as Function)(...args));
}

export function addFactory<T>(
  type: ServiceType<T>,
  factory: ServiceFactoryWithReturnFunction<T>,
  dependencies: ServiceType[] = [],
  behavior?: ServiceBehavior,
): ServiceAddFeature {
  return new ServiceAddFeature(serviceSet => serviceSet.addFactory(type, factory, dependencies, behavior));
}

export function addInherited(type: Type): ServiceAddFeature;
export function addInherited<T>(type: AbstractType<T>, implementation: Type<T>): ServiceAddFeature;
export function addInherited<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): ServiceAddFeature;
export function addInherited(...args: unknown[]) {
  return new ServiceAddFeature(serviceSet => (serviceSet.addInherited as Function)(...args));
}

export function addSingleton(type: Type): ServiceAddFeature;
export function addSingleton<T>(type: AbstractType<T>, implementation: Type<T>): ServiceAddFeature;
export function addSingleton<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): ServiceAddFeature;
export function addSingleton(...args: unknown[]) {
  return new ServiceAddFeature(serviceSet => (serviceSet.addSingleton as Function)(...args));
}

export function addScoped(type: Type): ServiceAddFeature;
export function addScoped<T>(type: AbstractType<T>, implementation: Type<T>): ServiceAddFeature;
export function addScoped<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): ServiceAddFeature;
export function addScoped(...args: unknown[]) {
  return new ServiceAddFeature(serviceSet => (serviceSet.addScoped as Function)(...args));
}

export function addPrototype(type: Type): ServiceAddFeature;
export function addPrototype<T>(type: AbstractType<T>, implementation: Type<T>): ServiceAddFeature;
export function addPrototype<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): ServiceAddFeature;
export function addPrototype(...args: unknown[]) {
  return new ServiceAddFeature(serviceSet => (serviceSet.addPrototype as Function)(...args));
}

export function addDecoratedBy(...decorators: DecoratorOuterFunction<ClassDecorator>[]): ServiceAddFeature {
  return new ServiceAddFeature(serviceSet => serviceSet.addDecoratedBy(...decorators));
}
