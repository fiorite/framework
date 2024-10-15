import { ServiceType } from './service-type';
import { ServiceProvideFunction } from './service-provider';
import { MapCallback } from '../core';

export class ServiceReference<R, T = any> {
  private readonly _type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this._type;
  }

  private readonly _project: MapCallback<T, R>;

  get project(): MapCallback<T, R> {
    return this._project;
  }

  constructor(type: ServiceType<T>, project?: MapCallback<T, R>) {
    this._type = type;
    this._project = project || function returnSelf(value: unknown) { return value as unknown as R };
  }

  receive(provide: ServiceProvideFunction): R {
    return this._project(provide(this._type));
  }
}

/** @todo refactor! generics hell */
export function serviceRef<T>(type: ServiceType<T>): ServiceReference<T, T>;
export function serviceRef<T, R>(type: ServiceType<T>, project: MapCallback<T, R>): ServiceReference<R, T>;
export function serviceRef(type: ServiceType, project?: MapCallback<unknown>): ServiceReference<unknown, unknown> {
  return new ServiceReference(type, project);
}
