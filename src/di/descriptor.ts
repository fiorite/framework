import { FunctionClass, MaybeOptional, MaybePromiseLike, Type, ValueCallback } from '../core';
import { ServiceType } from './type';
import { ServiceProvideCallback } from './provider';
import { ServiceFactoryCallback } from './factory';
import { ServiceBehavior } from './behavior';
import { Provide } from './provide';

type PrototypeFactoryFunction<T = unknown> = (args: any[], done: ValueCallback<T>) => void;

export class ServiceDescriptor<T = unknown> {
  private readonly _type: ServiceType<T>;

  get type(): ServiceType<T> {
    return this._type;
  }

  private readonly _prototypeFactory: PrototypeFactoryFunction<T>;

  private readonly _dependencies: readonly MaybeOptional<ServiceType>[];

  get dependencies(): readonly MaybeOptional<ServiceType>[] {
    return this._dependencies;
  }

  private readonly _behavior: ServiceBehavior;

  get behavior(): ServiceBehavior {
    return this._behavior;
  }

  get inheritedBehavior(): boolean {
    return ServiceBehavior.Inherited === this.behavior;
  }

  get singletonBehavior(): boolean {
    return ServiceBehavior.Singleton === this.behavior;
  }

  get scopedBehavior(): boolean {
    return ServiceBehavior.Scoped === this.behavior;
  }

  get prototypeBehavior(): boolean {
    return ServiceBehavior.Prototype === this.behavior;
  }

  static fromValue<T extends object | FunctionClass>(object: T): ServiceDescriptor<T>;
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

    return new ServiceDescriptor(type!, (_, done) => done(value), [], ServiceBehavior.Singleton);
  }

  static fromType<T>(type: Type<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType<T>(type: Type<T>, dependencies: MaybeOptional<ServiceType>[], behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType<T>(type: ServiceType<T>, implementationType: Type<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType<T>(type: ServiceType<T>, implementationType: Type<T>, dependencies: MaybeOptional<ServiceType>[], behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromType(...args: unknown[]): ServiceDescriptor {
    let type: ServiceType, prototypeFactory: PrototypeFactoryFunction,
      dependencies: readonly MaybeOptional<ServiceType>[],
      behavior: ServiceBehavior | undefined;

    if (args.length === 1) { // @1 = type: Type<T>
      type = args[0] as Type;
      const target = Provide.targetAssemble(type as Type);
      prototypeFactory = (args1, done) => target(args1, args2 => done(new (args[0] as Type)(...args2)));
      dependencies = target.dependencies;
    } else if (args.length === 2) {
      if (Array.isArray(args[1])) { // @2 = type: Type<T>, dependencies: ServiceType[]
        type = args[0] as Type;
        prototypeFactory = (args1, done) => done(new (type as Type)(...args1));
        dependencies = args[1];
      } else if (args[1] instanceof ServiceBehavior) { // type: Type<T>, behavior: ServiceBehavior
        type = args[0] as Type;
        const target = Provide.targetAssemble(type as Type);
        prototypeFactory = (args1, done) => target(args1, args2 => done(new (type as Type)(...args2)));
        dependencies = target.dependencies;
        behavior = args[1];
      } else { // @3 = type: ServiceType<T>, implementationType: Type<T>
        type = args[0] as Type;
        const target = Provide.targetAssemble(type as Type);
        prototypeFactory = (args1, done) => target(args1, args2 => done(new (args[1] as Type)(...args2)));
        dependencies = target.dependencies;
      }
    } else if (args.length === 3) {
      if (Array.isArray(args[1])) { // @2 = type: Type<T>, dependencies: ServiceType[], behavior: ServiceBehavior
        type = args[0] as Type;
        prototypeFactory = (args1, done) => done(new (type as Type)(...args1));
        dependencies = args[1];
        behavior = args[2] as ServiceBehavior;
      } else if (Array.isArray(args[2])) { // @4 = type: ServiceType<T>, implementationType: Type<T>, dependencies: ServiceType[]
        type = args[0] as ServiceType;
        prototypeFactory = (args1, done) => done(new (args[1] as Type)(...args1));
        dependencies = args[2];
      } else { // type: @3 = ServiceType<T>, implementationType: Type<T>, behavior: ServiceBehavior
        type = args[0] as ServiceType;
        behavior = args[2] as ServiceBehavior;
        const target = Provide.targetAssemble(type as Type);
        prototypeFactory = (args1, done) => target(args1, args2 => done(new (args[1] as Type)(...args2)));
        dependencies = target.dependencies;
      }
    } else { // @4 = type: ServiceType<T>, implementationType: Type<T>, dependencies: ServiceType[], behavior: ServiceBehavior
      type = args[0] as ServiceType;
      prototypeFactory = (args1, done) => done(new (args[1] as Type)(...args1));
      dependencies = args[2] as ServiceType[];
      behavior = args[3] as ServiceBehavior;
    }

    return new ServiceDescriptor(type, prototypeFactory, dependencies, behavior);
  }

  static fromFactory<T>(type: ServiceType<T>, prototypeFunction: () => MaybePromiseLike<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromFactory<T>(type: ServiceType<T>, dependencies: MaybeOptional<ServiceType>[], prototypeFunction: (...args: any[]) => MaybePromiseLike<T>, behavior?: ServiceBehavior): ServiceDescriptor<T>;
  static fromFactory(...args: unknown[]) {
    const type = args[0] as ServiceType;
    let prototypeFactory: PrototypeFactoryFunction, dependencies: readonly MaybeOptional<ServiceType>[],
      behavior: ServiceBehavior | undefined;

    if (2 === args.length || typeof args[2] === 'number') { // @1 = type: ServiceType<T>, prototypeFunction: () => MaybePromiseLike<T>, behavior?: ServiceBehavior
      dependencies = [];
      prototypeFactory = (_, done) => MaybePromiseLike.then(() => (args[1] as Function)(), done);
      behavior = args[2] as ServiceBehavior | undefined;
    } else { // @2 = type: ServiceType<T>, dependencies: ServiceType[], prototypeFunction: () => MaybePromiseLike<T>, behavior?: ServiceBehavior
      dependencies = args[1] as MaybeOptional<ServiceType>[];
      prototypeFactory = (args2, done) => MaybePromiseLike.then(() => (args[2] as Function)(...args2), done);
      behavior = args[3] as ServiceBehavior | undefined;
    }

    // if (dependencies.length < factory.length) {
    //       throw new Error('Factory dependencies missing. Deps [' + dependencies.map(ServiceType.toString).join(', ') + ']. Function: ' + factory.toString());
    //     }

    return new ServiceDescriptor(type, prototypeFactory, dependencies, behavior);
  }

  private constructor(
    type: ServiceType<T>,
    prototypeFactory: PrototypeFactoryFunction<T>,
    dependencies: readonly MaybeOptional<ServiceType>[],
    behavior?: ServiceBehavior
  ) {
    this._type = type;
    this._prototypeFactory = prototypeFactory;
    this._dependencies = dependencies;
    this._behavior = undefined === behavior ? ServiceBehavior.Inherited : behavior;
  }

  withBehavior(other: ServiceBehavior): ServiceDescriptor<T> {
    return new ServiceDescriptor(this.type, this._prototypeFactory, this.dependencies, other);
  }

  prototype(provide: ServiceProvideCallback, done: ValueCallback<T>) {
    ServiceFactoryCallback.all(this._dependencies)(provide, args => this._prototypeFactory(args, done));
  }
}
