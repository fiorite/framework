import { ServiceType } from './service-type';
import { ServiceProvideFunction } from './service-provider';
import { MapCallback } from '../core';

export class ServiceReference<T> {
  private readonly _type: ServiceType;

  get type(): ServiceType {
    return this._type;
  }

  private readonly _project: MapCallback<unknown, T>;

  get project(): MapCallback<unknown, T> {
    return this._project;
  }

  constructor(type: ServiceType, project?: MapCallback<unknown, T>) {
    this._type = type;
    this._project = project || function returnSelf(value: unknown) { return value as unknown as T };
  }

  receive(provide: ServiceProvideFunction): T {
    return this._project(provide(this._type));
  }
}

/** @todo refactor! generics hell */
export function serviceRef<T>(type: ServiceType<T>): ServiceReference<T>;
export function serviceRef<T, P>(type: ServiceType<P>, project: MapCallback<P, T>): ServiceReference<T>;
export function serviceRef(type: ServiceType, project?: MapCallback<unknown>): ServiceReference<unknown> {
  return new ServiceReference(type, project);
}
