import { ServiceType } from './service-type';
import { ServiceProviderWithReturnFunction } from './service-provider';
import { MapCallback } from '../core';

export class ServiceReference<T, R = T> {
  readonly #type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this.#type;
  }

  readonly #project: MapCallback<T, R>;

  project(): MapCallback<T, R> {
    return this.#project;
  }

  constructor(type: ServiceType<T>, project?: MapCallback<T, R>) {
    this.#type = type;
    this.#project = project || ((value: T) => value as unknown as R);
  }

  receive(provide: ServiceProviderWithReturnFunction): R {
    return this.#project(provide(this.#type));
  }
}

export function serviceReference<T>(type: ServiceType<T>): ServiceReference<T>;
export function serviceReference<T, R>(type: ServiceType<T>, project: MapCallback<T, R>): ServiceReference<T, R>;
export function serviceReference(type: ServiceType, project?: MapCallback<unknown>): ServiceReference<unknown> {
  return new ServiceReference(type, project);
}
