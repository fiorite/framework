import { ServiceType } from './type';
import { ServiceFactoryReturnFunction } from './function';
import { ServiceBehavior } from './behavior';
import { AnyCallback, FunctionClass, Type } from '../core';
import { ServiceFactory, ServiceFactoryReturn, SingletonFactory, TypeFactory, ValueFactory } from './factory';

export class ServiceDescriptor<T = unknown> {
  private readonly _type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this._type;
  }

  private readonly _factory: ServiceFactory<T>;

  get factory(): ServiceFactory<T> {
    return this._factory;
  }

  private readonly _dependencies: readonly ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  private readonly _behavior: ServiceBehavior;

  get behavior(): ServiceBehavior {
    return this._behavior;
  }

  static value<T extends object | FunctionClass<AnyCallback>>(value: T): ServiceDescriptor<T>;
  static value<T>(type: ServiceType<T>, value: T): ServiceDescriptor<T>;
  static value(...args: unknown[]): ServiceDescriptor {
    let type: ServiceType, value: object;

    if (1 === args.length) {
      value = args[0] as object;
      type = value.constructor;
    }

    if (2 === args.length) {
      type = args[0] as ServiceType;
      value = args[1] as object;
    }

    return new ServiceDescriptor(type!, new ValueFactory(value!), [], ServiceBehavior.Singleton);
  }

  static factory<T>(
    type: ServiceType<T>,
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behaviour?: ServiceBehavior,
  ): ServiceDescriptor<T> {
    if (dependencies.length < factory.length) {
      throw new Error('Factory dependencies missing. Deps [' + dependencies.map(ServiceType.toString).join(', ') + ']. Function: ' + factory.toString());
    }

    return new ServiceDescriptor(type, new ServiceFactoryReturn(factory, dependencies), dependencies, behaviour);
  }

  static type<T>(type: Type<T>, behaviour?: ServiceBehavior): ServiceDescriptor<T>;
  static type<T>(type: ServiceType<T>, actual: Type<T>, behaviour?: ServiceBehavior): ServiceDescriptor<T>;
  static type(...args: unknown[]): ServiceDescriptor {
    let type: ServiceType, factory: TypeFactory, behaviour: ServiceBehavior | undefined;
    if (1 === args.length || (2 === args.length && typeof args[1] === 'number')) {
      type = args[0] as Type;
      behaviour = args[1] as ServiceBehavior | undefined;
      factory = new TypeFactory(type as Type);
    } else {
      type = args[0] as ServiceType;
      behaviour = args[2] as ServiceBehavior | undefined;
      factory = new TypeFactory(args[1] as Type);
    }

    return new ServiceDescriptor(type, factory, factory.dependencies, behaviour);
  }

  private constructor(
    type: ServiceType<T>,
    factory: ServiceFactory<T>,
    dependencies: readonly ServiceType[] = [],
    behavior?: ServiceBehavior
  ) {
    this._type = type;
    this._dependencies = dependencies;
    this._behavior = behavior || ServiceBehavior.Inherited;
    this._factory = ServiceBehavior.Singleton === this._behavior ?
      new SingletonFactory(factory) : factory;
  }

  inherit(behavior: ServiceBehavior.Scoped | ServiceBehavior.Singleton): ServiceDescriptor<T> {
    if (ServiceBehavior.Inherited !== this.behavior) {
      throw new Error('Current behaviour does not allow behaviour inheritance');
    }

    return new ServiceDescriptor(this.type, this.factory, this.dependencies, behavior);
  }
}
