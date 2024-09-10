import { ServiceBehaviour } from './behaviour';
import { ServiceKey } from './key';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback, MaybePromise,
  ParameterDecoratorWithPayload
} from '../core';

export interface ServiceOptions<T> {
  readonly serviceKey: ServiceKey<T>;
  readonly behaviour: ServiceBehaviour;
}

export class ServicePayload<T> {
  private readonly _serviceKey?: ServiceKey<T>;

  get serviceKey(): ServiceKey<T> | undefined {
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
  private readonly _referTo?: ServiceKey<T>;

  get referTo(): ServiceKey<T> | undefined {
    return this._referTo;
  }

  private readonly _callback: MapCallback<T, MaybePromise<R>>;

  get callback(): MapCallback<T, MaybePromise<R>> {
    return this._callback;
  }

  constructor(serviceKey?: ServiceKey<T>, callback?: MapCallback<T, MaybePromise<R>>) {
    this._referTo = serviceKey;
    this._callback = callback || ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }
}

export function Provide<T, R = unknown>(serviceKey?: ServiceKey<T>, callback?: MapCallback<T, MaybePromise<R>>): ParameterDecoratorWithPayload<ProvidePayload<T, R>> {
  const payload = new ProvidePayload(serviceKey, callback);
  return makeParameterDecorator(Provide, payload);
}
