import { ServiceBehaviour } from './behaviour';
import { ServiceType } from './type';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback, MaybePromise,
  ParameterDecoratorWithPayload
} from '../core';

export interface ServiceOptions<T> {
  readonly serviceKey: ServiceType<T>;
  readonly behaviour: ServiceBehaviour;
}

export class ServicePayload<T> {
  private readonly _serviceKey?: ServiceType<T>;

  get serviceKey(): ServiceType<T> | undefined {
    return this._serviceKey;
  }

  private readonly _behaviour?: ServiceBehaviour;

  get behaviour(): ServiceBehaviour | undefined {
    return this._behaviour;
  }

  constructor(options: Partial<ServiceOptions<T>> = {}) {
    this._serviceKey = options.serviceKey;
    this._behaviour = options.behaviour;
  }
}

export function Service<T>(options?: Partial<ServiceOptions<T>>): ClassDecoratorWithPayload<ServicePayload<T>> {
  const payload = new ServicePayload(options);
  return makeClassDecorator(Service, payload);
}

export class ProvidePayload<T, R = unknown> {
  private readonly _referTo?: ServiceType<T>;

  get referTo(): ServiceType<T> | undefined {
    return this._referTo;
  }

  private readonly _callback: MapCallback<T, MaybePromise<R>>;

  get callback(): MapCallback<T, MaybePromise<R>> {
    return this._callback;
  }

  constructor(serviceKey?: ServiceType<T>, callback?: MapCallback<T, MaybePromise<R>>) {
    this._referTo = serviceKey;
    this._callback = callback || ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }
}

export function Provide<T, R = unknown>(serviceKey?: ServiceType<T>, callback?: MapCallback<T, MaybePromise<R>>): ParameterDecoratorWithPayload<ProvidePayload<T, R>> {
  const payload = new ProvidePayload(serviceKey, callback);
  return makeParameterDecorator(Provide, payload);
}
