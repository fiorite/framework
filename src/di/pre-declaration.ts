import { ServiceType } from './service-type';
import { ServiceBehaviour } from './behaviour';
import { Type } from '../core';

/**
 * Middle layer to connect {@link ServiceSet} and {@link DecoratorRecorder}.
 */
export class ServicePreDeclaration<T = unknown> {
  private readonly _serviceType: ServiceType<T>;

  get serviceType(): ServiceType<T> {
    return this._serviceType;
  }

  private readonly _actualType: Type<T>;

  get actualType(): Type<T> {
    return this._actualType;
  }

  private readonly _behaviour?: ServiceBehaviour;

  get behaviour(): ServiceBehaviour | undefined {
    return this._behaviour;
  }

  constructor({ serviceType, actualType, behaviour }: {
    readonly actualType: Type<T>;
    readonly serviceType: ServiceType<T>;
    readonly behaviour?: ServiceBehaviour;
  }) {
    this._serviceType = serviceType;
    this._actualType = actualType;
    this._behaviour = behaviour;
  }
}
