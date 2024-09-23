import { ServiceType } from './type';
import { ServiceBehavior } from './behavior';
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

  private readonly _behaviour?: ServiceBehavior;

  get behaviour(): ServiceBehavior | undefined {
    return this._behaviour;
  }

  constructor({ serviceType, actualType, behaviour }: {
    readonly actualType: Type<T>;
    readonly serviceType: ServiceType<T>;
    readonly behaviour?: ServiceBehavior;
  }) {
    this._serviceType = serviceType;
    this._actualType = actualType;
    this._behaviour = behaviour;
  }
}
