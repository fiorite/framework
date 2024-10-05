import { ServiceType } from './service-type';
import { ServiceBehavior } from './service-behavior';
import { FunctionClass, Type } from '../core';
import {
  ServiceFactory,
  ServiceFactoryWithReturn,
  ServiceFactoryWithReturnFunction,
  TypeFactory,
  ValueFactory
} from './service-factory';

export class ServiceDescriptor<T = unknown> {
  readonly #type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this.#type;
  }

  readonly #factory: ServiceFactory<T>;

  get factory(): ServiceFactory<T> {
    return this.#factory;
  }

  get dependencies(): readonly ServiceType[] {
    return this.#factory.dependencies;
  }

  readonly #behavior: ServiceBehavior;

  get behavior(): ServiceBehavior {
    return this.#behavior;
  }

  static fromValue<T extends object | FunctionClass>(value: T): ServiceDescriptor<T>;
  static fromValue<T>(type: ServiceType<T>, value: T): ServiceDescriptor<T>;
  static fromValue(...args: unknown[]): ServiceDescriptor {
    let type: ServiceType, value: object;

    if (1 === args.length) {
      value = args[0] as object;
      type = value.constructor;
    }

    if (2 === args.length) {
      type = args[0] as ServiceType;
      value = args[1] as object;
    }

    return new ServiceDescriptor(type!, new ValueFactory(value!), ServiceBehavior.Singleton);
  }

  static fromFactory<T>(
    type: ServiceType<T>,
    factory: ServiceFactoryWithReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): ServiceDescriptor<T> {
    if (dependencies.length < factory.length) {
      throw new Error('Factory dependencies missing. Deps [' + dependencies.map(ServiceType.toString).join(', ') + ']. Function: ' + factory.toString());
    }

    return new ServiceDescriptor(type, new ServiceFactoryWithReturn(factory, dependencies), behavior);
  }

  static fromType<T>(type: Type<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType(...args: unknown[]): ServiceDescriptor {
    let type: ServiceType, factory: TypeFactory, behavior: ServiceBehavior | undefined;
    if (1 === args.length || (2 === args.length && typeof args[1] === 'number')) {
      type = args[0] as Type;
      behavior = args[1] as ServiceBehavior | undefined;
      factory = new TypeFactory(type as Type);
    } else {
      type = args[0] as ServiceType;
      behavior = args[2] as ServiceBehavior | undefined;
      factory = new TypeFactory(args[1] as Type);
    }

    return new ServiceDescriptor(type, factory, behavior);
  }

  private constructor(
    type: ServiceType<T>,
    factory: ServiceFactory<T>,
    behavior?: ServiceBehavior
  ) {
    this.#type = type;
    this.#behavior = behavior || ServiceBehavior.Inherited;
    this.#factory = factory;
  }

  inherit(behavior: ServiceBehavior.Scoped | ServiceBehavior.Singleton): ServiceDescriptor<T> {
    if (ServiceBehavior.Inherited !== this.behavior) {
      throw new Error('Current behavior does not allow behavior inheritance');
    }

    return new ServiceDescriptor(this.type, this.factory, behavior);
  }

  toString(): string {
    return '[ServiceDescriptor: ' + ServiceType.toString(this.type) + ']'; // todo: provide extra information;
  }
}
