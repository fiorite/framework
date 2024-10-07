import { ServiceType } from './service-type';
import { ServiceProviderWithReturnFunction } from './service-provider';
import { MapCallback } from '../core';

export class ServiceReference<T> {
  readonly #type: ServiceType;

  get type(): ServiceType {
    return this.#type;
  }

  readonly #project: MapCallback<unknown, T>;

  project(): MapCallback<unknown, T> {
    return this.#project;
  }

  constructor(type: ServiceType, project?: MapCallback<unknown, T>) {
    this.#type = type;
    this.#project = project || ((value: unknown) => value as unknown as T);
  }

  receive(provide: ServiceProviderWithReturnFunction): T {
    return this.#project(provide(this.#type));
  }
}

/** @todo refactor! generics hell */
export function serviceRef<T>(type: ServiceType<T>): ServiceReference<T>;
export function serviceRef<T, P>(type: ServiceType<P>, project: MapCallback<P, T>): ServiceReference<T>;
export function serviceRef(type: ServiceType, project?: MapCallback<unknown>): ServiceReference<unknown> {
  return new ServiceReference(type, project);
}
