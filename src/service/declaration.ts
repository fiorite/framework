import { ServiceKey } from './key';
import { ServiceFactoryFunction, ServiceLinearFactoryFunction } from './function-type';
import { ServiceBehaviour } from './behaviour';
import { Type } from '../core';
import { ServiceClassResolver } from './_resolver';
import { ServiceInstanceFactory, ServiceLinearFactory, ServiceSingletonFactory } from './_factory';

export class ServiceDeclaration<T = unknown> {
  private readonly _serviceKey: ServiceKey<T>;

  get serviceKey(): ServiceKey<T> {
    return this._serviceKey;
  }

  private readonly _serviceFactory: ServiceFactoryFunction<T>;

  get serviceFactory(): ServiceFactoryFunction<T> {
    return this._serviceFactory;
  }

  private readonly _dependencies: readonly ServiceKey[] = [];

  get dependencies(): readonly ServiceKey[] {
    return this._dependencies;
  }

  private readonly _behaviour: ServiceBehaviour;

  get behaviour(): ServiceBehaviour {
    return this._behaviour;
  }

  private readonly _inheritedFrom?: ServiceDeclaration<T>;

  get inheritedFrom(): ServiceDeclaration<T> | undefined {
    return this._inheritedFrom;
  }

  static fromInstance<T extends object>(options: {
    readonly serviceKey?: ServiceKey<T>;
    readonly serviceInstance: T;
  }): ServiceDeclaration<T> {
    return new ServiceDeclaration({
      serviceKey: options.serviceKey || options.serviceInstance.constructor,
      serviceFactory: new ServiceInstanceFactory(options.serviceInstance),
      dependencies: [],
      behaviour: ServiceBehaviour.Singleton,
    });
  }

  static fromFactory<T>(options: {
    readonly serviceKey: ServiceKey<T>;
    readonly linearFactory: ServiceLinearFactoryFunction<T>,
    readonly dependencies?: readonly ServiceKey[],
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const linearFactory = new ServiceLinearFactory(options.linearFactory, options.dependencies || []);
    return new ServiceDeclaration({
      serviceKey: options.serviceKey,
      serviceFactory: linearFactory,
      dependencies: linearFactory.dependencies,
      behaviour: options.behaviour,
    });
  }

  static fromType<T>(options: {
    readonly serviceKey?: ServiceKey<T>;
    readonly serviceType: Type<T>;
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const classResolver = ServiceClassResolver.useLightweight(options.serviceType);
    return new ServiceDeclaration({
      serviceKey: options.serviceKey || options.serviceType,
      serviceFactory: classResolver,
      dependencies: classResolver.dependencies,
      behaviour: options.behaviour,
    });
  }

  private constructor(options: {
    readonly serviceKey: ServiceKey<T>;
    readonly serviceFactory: ServiceFactoryFunction<T>;
    readonly dependencies: readonly ServiceKey[];
    readonly behaviour?: ServiceBehaviour;
    readonly inheritedFrom?: ServiceDeclaration<T>;
  }) {
    this._serviceKey = options.serviceKey;
    this._dependencies = options.dependencies;
    this._behaviour = options.behaviour || ServiceBehaviour.Inherit;
    this._inheritedFrom = options.inheritedFrom;
    this._serviceFactory = ServiceBehaviour.Singleton === options.behaviour ?
      new ServiceSingletonFactory(options.serviceFactory) : options.serviceFactory;
  }

  inheritBehaviour(behaviour: ServiceBehaviour.Scoped | ServiceBehaviour.Singleton): ServiceDeclaration<T> {
    if (ServiceBehaviour.Inherit !== this.behaviour) {
      throw new Error('Current behaviour does not allow behaviour inheritance');
    }

    return new ServiceDeclaration<T>({
      serviceKey: this.serviceKey,
      serviceFactory: this._serviceFactory,
      dependencies: this.dependencies,
      behaviour,
      inheritedFrom: this,
    });
  }
}
