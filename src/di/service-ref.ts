import { ServiceType } from './service-type';
import { ServiceProviderWithReturnFunction } from './service-provider';
import { MapCallback } from '../core';

/** @deprecated experimental */
export class ServiceRef<T, R = T> {
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

/** @deprecated experimental */
export function serviceRef<T>(type: ServiceType<T>): ServiceRef<T>;
/** @deprecated experimental */
export function serviceRef<T, R>(type: ServiceType<T>, project: MapCallback<T, R>): ServiceRef<T, R>;
/** @deprecated experimental */
export function serviceRef(type: ServiceType, project?: MapCallback<unknown>): ServiceRef<unknown> {
  return new ServiceRef(type, project);
}
