import { ServiceType } from './type';
import { ServiceFactoryReturnFunction, ServiceProvideFunction } from './function';
import { ServiceBehavior } from './behavior';
import { AnyCallback, FunctionClass, Type, ValueCallback } from '../core';
import { LateServiceFactory, ServiceFactory, ServiceFactoryReturn, TypeFactory, ValueFactory } from './factory';

export class ServiceDescriptor<T = unknown> {
  get lateType(): boolean {
    return  this.factory instanceof LateServiceFactory;
  }

  private readonly _type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this._type;
  }

  private readonly _factory: ServiceFactory<T>;

  get factory(): ServiceFactory<T> {
    return this._factory;
  }

  get dependencies(): readonly ServiceType[] {
    return this._factory.dependencies;
  }

  private readonly _behavior: ServiceBehavior;

  get behavior(): ServiceBehavior {
    return this._behavior;
  }

  /**
   * @deprecated not implemented yet, only draft, only idea
   */
  static fromLateFactory<T>(
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): ServiceDescriptor<[Type<T>, T]> {
    if (dependencies.length < factory.length) {
      throw new Error('Factory dependencies missing. Deps [' + dependencies.map(ServiceType.toString).join(', ') + ']. Function: ' + factory.toString());
    }

    const factoryReturn = new ServiceFactoryReturn(factory, dependencies);
    const lateFactory = new LateServiceFactory(factoryReturn);
    return new ServiceDescriptor(lateFactory, lateFactory, behavior);
  }

  static fromValue<T extends object | FunctionClass<AnyCallback>>(value: T): ServiceDescriptor<T>;
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
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): ServiceDescriptor<T> {
    if (dependencies.length < factory.length) {
      throw new Error('Factory dependencies missing. Deps [' + dependencies.map(ServiceType.toString).join(', ') + ']. Function: ' + factory.toString());
    }

    return new ServiceDescriptor(type, new ServiceFactoryReturn(factory, dependencies), behavior);
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
    this._type = type;
    this._behavior = behavior || ServiceBehavior.Inherited;
    this._factory = factory;
  }

  /**
   * @deprecated not implemented yet, only draft, only idea
   */
  catchUp(provide: ServiceProvideFunction, callback: ValueCallback<T extends [Type, infer P] ? [ServiceDescriptor<P>, P] : never>): void {
    if (!this.lateType) {
      throw new Error('unable to catch up with descriptor that is not late factory.');
    }

    const factory = this.factory as unknown as LateServiceFactory;

    factory(provide, ([type, value]) => {
      const descriptor = new ServiceDescriptor(type, factory.original, this.behavior);
      callback([descriptor, value] as any);
    });
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

