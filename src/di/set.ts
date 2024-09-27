import { ServiceProvider } from './provider';
import { ServiceDescriptor } from './descriptor';
import { ServiceType } from './type';
import { BehaveLike } from './decorator';
import { ServiceBehavior } from './behavior';
import {
  AbstractType,
  CustomSet,
  DecoratorOuterFunction,
  DecoratorRecorder,
  isType,
  Type,
  ValueCallback
} from '../core';
import { ServiceFactoryReturnFunction } from './function';

export class ServiceSet extends CustomSet<ServiceDescriptor, ServiceType> {
  get [Symbol.toStringTag](): string {
    return 'ServiceSet';
  }

  private readonly _behavioralMap = new Map<Type, ServiceBehavior>();

  constructor(
    behavioralMap: Iterable<[Type, ServiceBehavior]> = DecoratorRecorder.classSearch(BehaveLike)
      .map(d => [d.path[0] as Type, d.payload.behavior])
  ) {
    const getServiceType = (def: ServiceDescriptor) => def.type;
    super(getServiceType);
    this._behavioralMap = new Map(behavioralMap);
  }

  /**
   * @deprecated an issue regarding late factories.
   * solution could be to create late types which resolves with late factories.
   * if type is recognized in late factory, late type will be ignored.
   * kinda cool approach.
   */
  addDecoratedBy(...decorators: DecoratorOuterFunction<ClassDecorator>[]): this {
    decorators.flatMap(decorator => DecoratorRecorder.classSearch(decorator).map(x => x.path[0]))
      .filter(type => !this[CustomSet.data].has(type))
      .forEach(type => this.addType(type as Type));
    return this;
  }

  /**
   * @deprecated an issue regarding late factories
   */
  includeDependencies(): this {
    const queue = Array.from(this);
    while (queue.length) {
      const descriptor = queue.shift()!;
      descriptor.dependencies
        .filter(dependency => !this[CustomSet.data].has(dependency) && dependency !== ServiceProvider)
        .filter(isType)
        .map(type => this._addType(type))
        .forEach(descriptor2 => queue.push(descriptor2));
    }
    return this;
  }

  addAll(iterable: Iterable<Type | ServiceDescriptor | object>): this {
    Array.from(iterable).forEach(item => {
      if (item instanceof ServiceDescriptor) {
        this.add(item);
      } else {
        if (isType(item)) {
          this.addType(item);
        } else {
          this.addValue(item);
        }
      }
    });
    return this;
  }

  addType(type: Type): this;
  addType<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): this;
  addType(...args: unknown[]): this {
    if (args.length === 1) {
      this._addType(args[0] as Type);
    } else {
      this._addType(args[1] as Type, args[0] as ServiceType, args[2] as ServiceBehavior);
    }
    return this;
  }

  private _addType<T>(implementation: Type<T>, type: ServiceType<T> = implementation, behavior?: ServiceBehavior): ServiceDescriptor {
    if (!behavior) {
      behavior = this._behavioralMap.get(implementation) || ServiceBehavior.Inherited;
    }

    const descriptor = ServiceDescriptor.fromType(type, implementation, behavior);
    this.add(descriptor);
    return descriptor;
  }

  addFactory<T>(
    type: ServiceType<T>,
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): this {
    const descriptor = ServiceDescriptor.fromFactory(type, factory, dependencies, behavior);
    return this.add(descriptor);
  }

  /**
   * @deprecated not implemented yet, only draft, only idea
   */
  addLateFactory<T>(
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): this {
    const descriptor = ServiceDescriptor.fromLateFactory(factory, dependencies, behavior);
    return this.add(descriptor);
  }

  addValue(object: object): this;
  addValue<T extends object>(serviceType: ServiceType<T>, object: T): this;
  addValue(...args: unknown[]): this {
    return this.add(
      args.length === 1 ? ServiceDescriptor.fromValue(args[0] as object) :
        ServiceDescriptor.fromValue(args[0] as ServiceType<object>, args[1] as object)
    );
  }

  addInherited(type: Type): this;
  addInherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, factory: ServiceFactoryReturnFunction<T>, dependencies?: ServiceType[]): this;
  addInherited(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Inherited);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Inherited);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Inherited
    );
  }

  addSingleton(type: Type): this;
  addSingleton<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addSingleton<T>(type: AbstractType<T>, callback: ServiceFactoryReturnFunction<T>, dependencies?: ServiceType[]): this;
  addSingleton(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Singleton);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Singleton);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Singleton
    );
  }

  addScoped(type: Type): this;
  addScoped<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addScoped<T>(type: AbstractType<T>, callback: ServiceFactoryReturnFunction<T>, dependencies?: ServiceType[]): this;
  addScoped(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Scoped);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Scoped);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Scoped
    );
  }

  addPrototype(type: Type): this;
  addPrototype<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addPrototype<T>(type: AbstractType<T>, callback: ServiceFactoryReturnFunction<T>, dependencies?: ServiceType[]): this;
  addPrototype(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Prototype);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Prototype);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Prototype
    );
  }
}

/** @deprecated will be refactored */
export function makeServiceProvider(configure: Iterable<Type | ServiceDescriptor | object> | ValueCallback<ServiceSet>): ServiceProvider {
  const serviceSet = new ServiceSet();

  if ('function' === typeof configure) {
    configure(serviceSet);
  } else {
    serviceSet.addAll(configure);
  }

  return new ServiceProvider(serviceSet);
}
