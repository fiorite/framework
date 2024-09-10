import { ServiceBehaviour } from './behaviour';
import { ServiceKey } from './key';
import {
  ClassDecoratorWithData,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback, MaybePromise,
  ParameterDecoratorWithData
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

export function Service<T>(options?: Partial<ServiceOptions<T>>): ClassDecoratorWithData<ServicePayload<T>> {
  const data = new ServicePayload(options);
  return makeClassDecorator(Service, data);
}

export class ProvidePayload<T, R = unknown> {
  private readonly _referTo: ServiceKey<T>;

  get referTo(): ServiceKey<T> {
    return this._referTo;
  }

  private readonly _callback: MapCallback<T, MaybePromise<R>>;

  get callback(): MapCallback<T, MaybePromise<R>> {
    return this._callback;
  }

  constructor(serviceKey: ServiceKey<T>, callback?: MapCallback<T, MaybePromise<R>>) {
    this._referTo = serviceKey;
    this._callback = callback || ((x: T) => x) as unknown as MapCallback<T, MaybePromise<R>>;
  }
}

export function Provide<T, R = unknown>(serviceKey: ServiceKey<T>, callback?: MapCallback<T, MaybePromise<R>>): ParameterDecoratorWithData<ProvidePayload<T, R>> {
  const data = new ProvidePayload(serviceKey, callback);
  return makeParameterDecorator(Provide, data);
}
