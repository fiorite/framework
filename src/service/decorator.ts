import { ServiceBehaviour } from './behaviour';
import { ServiceType } from './type';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback,
  MaybePromise,
  ParameterDecoratorWithPayload
} from '../core';
import { ServiceLinearFactoryFunction } from './function-type';

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

export function Service<T>(options?: Partial<ServiceOptions<T>>): ClassDecoratorWithPayload<ServicePayload<T>, T>
/**
 * @deprecated not implemented, experimental overload
 * @param factory
 * @param dependencies
 * @constructor
 */
export function Service<T>(factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): ClassDecoratorWithPayload<ServicePayload<T>, T>;
export function Service(...args: unknown[]): ClassDecoratorWithPayload<ServicePayload<unknown>, any> {
  let payload: ServicePayload<unknown>;

  if (!args.length || (args.length === 1 && typeof args === 'object')) {
    payload = new ServicePayload(args[0] || {});
  } else {
    throw new Error('not implemented, experimental overload'); // factory
  }

  return makeClassDecorator(Service, payload);
}

export const Singleton = (of?: ServiceType) => {
  return Service({ behaviour: ServiceBehaviour.Singleton, serviceKey: of }).calledBy(Singleton);
};

export const Scoped = (of?: ServiceType) => {
  return Service({ behaviour: ServiceBehaviour.Scoped, serviceKey: of, }).calledBy(Scoped);
};

export const Inherited = (of?: ServiceType) => {
  return Service({ behaviour: ServiceBehaviour.Inherited, serviceKey: of }).calledBy(Inherited);
};

export const Prototype = (of?: ServiceType) => {
  return Service({ behaviour: ServiceBehaviour.Prototype, serviceKey: of }).calledBy(Prototype);
};

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

export function Provide<T, R = unknown>(type?: ServiceType<T>, callback?: MapCallback<T, MaybePromise<R>>): ParameterDecoratorWithPayload<ProvidePayload<T, R>> {
  const payload = new ProvidePayload(type, callback);
  return makeParameterDecorator(Provide, payload);
}
