import { ServiceBehavior } from './behavior';
import { ServiceType } from './type';
import {
  ClassDecoratorWithPayload,
  makeClassDecorator,
  makeParameterDecorator,
  MapCallback,
  MaybePromise,
  ParameterDecoratorWithPayload
} from '../core';
import { ServiceFactoryReturnFunction } from './function';

export interface ServiceOptions<T> {
  readonly type: ServiceType<T>;
  readonly behaviour: ServiceBehavior;
}

export class ServicePayload<T> {
  private readonly _type?: ServiceType<T>;

  get type(): ServiceType<T> | undefined {
    return this._type;
  }

  private readonly _behaviour?: ServiceBehavior;

  get behaviour(): ServiceBehavior | undefined {
    return this._behaviour;
  }

  constructor(options: Partial<ServiceOptions<T>> = {}) {
    this._type = options.type;
    this._behaviour = options.behaviour;
  }
}

/**
 * @deprecated use {@link Inherited}, {@link Scoped}, {@link Singleton} or {@link Prototype} instead. will be removed soon.
 */
export function Service<T>(options?: Partial<ServiceOptions<T>>): ClassDecoratorWithPayload<ServicePayload<T>, T>
/**
 * @deprecated not implemented, experimental overload
 * @param factory
 * @param dependencies
 * @constructor
 */
export function Service<T>(factory: ServiceFactoryReturnFunction<T>, dependencies?: ServiceType[]): ClassDecoratorWithPayload<ServicePayload<T>, T>;
/**
 * @deprecated use {@link Inherited}, {@link Scoped}, {@link Singleton} or {@link Prototype} instead. will be removed soon.
 */
export function Service(...args: unknown[]): ClassDecoratorWithPayload<ServicePayload<unknown>, any> {
  let payload: ServicePayload<unknown>;

  if (!args.length || (args.length === 1 && typeof args === 'object')) {
    payload = new ServicePayload(args[0] || {});
  } else {
    throw new Error('not implemented, experimental overload'); // factory
  }

  return makeClassDecorator(Service, payload);
}

export const Singleton = (type?: ServiceType) => {
  return Service({ behaviour: ServiceBehavior.Singleton, type, }).calledBy(Singleton);
};

export const Scoped = (type?: ServiceType) => {
  return Service({ behaviour: ServiceBehavior.Scoped, type, }).calledBy(Scoped);
};

export const Inherited = (type?: ServiceType) => {
  return Service({ behaviour: ServiceBehavior.Inherited, type, }).calledBy(Inherited);
};

export const Prototype = () => {
  return Service({ behaviour: ServiceBehavior.Prototype, type: void 0, }).calledBy(Prototype);
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

export type ProvideDecorator<T, R = unknown> = ParameterDecoratorWithPayload<ProvidePayload<T, R>>;

export function Provide<T, R = unknown>(type?: ServiceType<T>, callback?: MapCallback<T, MaybePromise<R>>): ProvideDecorator<T, R> {
  const payload = new ProvidePayload(type, callback);
  return makeParameterDecorator(Provide, payload);
}
