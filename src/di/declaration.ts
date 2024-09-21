import { ServiceType } from './service-type';
import { ServiceFactoryFunction, ServiceLinearFactoryFunction } from './function';
import { ServiceBehaviour } from './behaviour';
import { Type } from '../core';
import { _ServiceClassResolver } from './_resolver';
import { ServiceInstanceFactory, ServiceLinearFactory, ServiceSingletonFactory } from './_factory';

export class ServiceDeclaration<T = unknown> {
  private readonly _serviceKey: ServiceType<T>;

  get serviceKey(): ServiceType<T> {
    return this._serviceKey;
  }

  private readonly _serviceFactory: ServiceFactoryFunction<T>;

  get serviceFactory(): ServiceFactoryFunction<T> {
    return this._serviceFactory;
  }

  private readonly _dependencies: readonly ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
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
    readonly serviceKey?: ServiceType<T>;
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
    readonly serviceKey: ServiceType<T>;
    readonly linearFactory: ServiceLinearFactoryFunction<T>,
    readonly dependencies?: readonly ServiceType[],
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const dependencies = options.dependencies || [];
    if (dependencies.length < options.linearFactory.length) {
      throw new Error('Factory dependencies missing. Deps ['+dependencies.map(ServiceType.toString).join(', ')+']. Function: '+options.linearFactory.toString());
    }

    const linearFactory = new ServiceLinearFactory(options.linearFactory, dependencies);
    return new ServiceDeclaration({
      serviceKey: options.serviceKey,
      serviceFactory: linearFactory,
      dependencies: linearFactory.dependencies,
      behaviour: options.behaviour,
    });
  }

  static fromType<T>(options: {
    readonly serviceKey?: ServiceType<T>;
    readonly serviceType: Type<T>;
    readonly behaviour?: ServiceBehaviour;
  }): ServiceDeclaration<T> {
    const classResolver = _ServiceClassResolver.from(options.serviceType);
    return new ServiceDeclaration({
      serviceKey: options.serviceKey || options.serviceType,
      serviceFactory: classResolver,
      dependencies: classResolver.dependencies,
      behaviour: options.behaviour,
    });
  }

  private constructor(options: {
    readonly serviceKey: ServiceType<T>;
    readonly serviceFactory: ServiceFactoryFunction<T>;
    readonly dependencies: readonly ServiceType[];
    readonly behaviour?: ServiceBehaviour;
    readonly inheritedFrom?: ServiceDeclaration<T>;
  }) {
    this._serviceKey = options.serviceKey;
    this._dependencies = options.dependencies;
    this._behaviour = options.behaviour || ServiceBehaviour.Inherited;
    this._inheritedFrom = options.inheritedFrom;
    this._serviceFactory = ServiceBehaviour.Singleton === options.behaviour ?
      new ServiceSingletonFactory(options.serviceFactory) : options.serviceFactory;
  }

  inheritBehaviour(behaviour: ServiceBehaviour.Scoped | ServiceBehaviour.Singleton): ServiceDeclaration<T> {
    if (ServiceBehaviour.Inherited !== this.behaviour) {
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
