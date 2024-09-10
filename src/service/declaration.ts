import { ServiceKey } from './key';
import { ServiceFactoryFunction } from './function-type';
import { ServiceBehaviour } from './behaviour';
import { MaybePromise, Type } from '../core';
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

  static fromInstance<T extends object>({serviceKey, serviceInstance}: {
    readonly serviceKey?: ServiceKey<T>;
    readonly serviceInstance: T;
  }): ServiceDeclaration<T> {
    return new ServiceDeclaration({
      serviceKey: serviceKey || serviceInstance.constructor,
      serviceFactory: new ServiceInstanceFactory(serviceInstance),
      dependencies: [],
      behaviour: ServiceBehaviour.Singleton,
    });
  }

  static fromFactory<T>({serviceKey, serviceFactory, dependencies, behaviour}: {
    readonly serviceKey: ServiceKey<T>;
    readonly serviceFactory: (...args: any[]) => MaybePromise<T>,
    readonly dependencies?: readonly ServiceKey[],
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const linearFactory = new ServiceLinearFactory(serviceFactory, dependencies || []);
    return new ServiceDeclaration({
      serviceKey,
      serviceFactory: linearFactory,
      dependencies: linearFactory.dependencies,
      behaviour,
    });
  }

  static fromType<T>({serviceKey, serviceType, behaviour}: {
    readonly serviceKey?: ServiceKey<T>;
    readonly serviceType: Type<T>;
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const classResolver = ServiceClassResolver.useLightweight(serviceType);
    return new ServiceDeclaration({
      serviceKey: serviceKey || serviceType,
      serviceFactory: classResolver,
      dependencies: classResolver.dependencies,
      behaviour: behaviour,
    });
  }

  private constructor({serviceKey, serviceFactory, dependencies, behaviour, inheritedFrom}: {
    readonly serviceKey: ServiceKey<T>;
    readonly serviceFactory: ServiceFactoryFunction<T>;
    readonly dependencies: readonly ServiceKey[];
    readonly behaviour?: ServiceBehaviour;
    readonly inheritedFrom?: ServiceDeclaration<T>;
  }) {
    this._serviceKey = serviceKey;
    this._dependencies = dependencies;
    this._behaviour = behaviour || ServiceBehaviour.Inherit;
    this._inheritedFrom = inheritedFrom;
    this._serviceFactory = ServiceBehaviour.Singleton === behaviour ?
      new ServiceSingletonFactory(serviceFactory) : serviceFactory;
  }

  inheritBehaviour(behaviour: ServiceBehaviour.Scope | ServiceBehaviour.Singleton): ServiceDeclaration<T> {
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
