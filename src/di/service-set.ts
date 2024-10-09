import { ServiceProvider } from './service-provider';
import { ServiceDescriptor } from './service-descriptor';
import { ServiceType } from './service-type';
import { BehaveLike } from './decorators';
import { ServiceBehavior } from './service-behavior';
import {
  AbstractType,
  DecoratorOuterFunction,
  DecoratorRecorder,
  isType,
  SetWithInnerKey,
  Type,
  VoidCallback
} from '../core';
import { iterableForEach } from '../iterable';
import { ServiceFactoryWithReturnFunction } from './service-factory';
import { EventEmitter } from '../core/event-emitter';

export class ServiceSet extends SetWithInnerKey<ServiceDescriptor, ServiceType> {
  get [Symbol.toStringTag](): string {
    return 'ServiceSet';
  }

  private readonly _changeEmitter = new EventEmitter();
  private readonly _behavioralMap = new Map<Type, ServiceBehavior>();

  constructor(
    // behavioralMap: Iterable<[Type, ServiceBehavior]> = DecoratorRecorder.classSearch(BehaveLike)
    //   .map(d => [d.path[0] as Type, d.payload]),
    onChange?: VoidCallback,
    behavioralMap: Iterable<[Type, ServiceBehavior]> = DecoratorRecorder.classSearch(BehaveLike)
      .map(d => [d.path[0] as Type, d.payload]),
  ) {
    const getServiceType = (def: ServiceDescriptor) => def.type;
    super(getServiceType);
    this._behavioralMap = new Map(behavioralMap);
    if (onChange) {
      this._changeEmitter.on('change', onChange);
    }
  }

  hasType(type: ServiceType): boolean {
    return this.innerMap.has(type);
  }

  addDecoratedBy(...decorators: DecoratorOuterFunction<ClassDecorator>[]): this {
    decorators.flatMap(decorator => DecoratorRecorder.classSearch(decorator).map(x => x.path[0]))
      .filter(type => !this.hasType(type))
      .forEach(type => this.addType(type as Type));
    return this;
  }

  includeDependencies(): this {
    const queue = Array.from(this);
    while (queue.length) {
      const descriptor = queue.shift()!;
      descriptor.dependencies
        .filter(dependency => !this.innerMap.has(dependency) && dependency !== ServiceProvider)
        .filter(isType)
        .map(type => this._addType(type))
        .forEach(descriptor2 => queue.push(descriptor2));
    }
    return this;
  }

  override add(value: ServiceDescriptor): this {
    super.add(value);
    this._changeEmitter.emit('change');
    return this;
  }

  override clear() {
    super.clear();
    this._changeEmitter.emit('change');
  }

  override delete(value: ServiceDescriptor): boolean {
    const result = super.delete(value);
    if (result) {
      this._changeEmitter.emit('change');
    }
    return result;
  }

  override addAll(iterable: Iterable<Type | ServiceDescriptor | object>): this {
    iterableForEach<Type | ServiceDescriptor | object>(item => {
      if (item instanceof ServiceDescriptor) {
        this.add(item);
      } else {
        if (isType(item)) {
          this.addType(item);
        } else {
          this.addValue(item);
        }
      }
    })(iterable);
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
    factory: ServiceFactoryWithReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behavior?: ServiceBehavior,
  ): this {
    const descriptor = ServiceDescriptor.fromFactory(type, factory, dependencies, behavior);
    return this.add(descriptor);
  }

  addValue(object: object): this;
  addValue<T>(serviceType: ServiceType<T>, object: T): this;
  addValue(...args: unknown[]): this {
    return this.add(
      args.length === 1 ? ServiceDescriptor.fromValue(args[0] as object) :
        ServiceDescriptor.fromValue(args[0] as ServiceType<object>, args[1] as object)
    );
  }

  addInherited(type: Type): this;
  addInherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, factory: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
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
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Inherited
    );
  }

  addSingleton(type: Type): this;
  addSingleton<T>(type: ServiceType<T>, value: T): this;
  addSingleton<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addSingleton<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
  addSingleton(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehavior.Singleton);
    }

    if (args.length === 2) {
      if (isType(args[1])) {
        return this.addType(args[0] as AbstractType, args[1], ServiceBehavior.Singleton);
      }

      return this.addValue(args[0] as Type, args[1] as object);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Singleton
    );
  }

  addScoped(type: Type): this;
  addScoped<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addScoped<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
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
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Scoped
    );
  }

  addPrototype(type: Type): this;
  addPrototype<T>(type: ServiceType<T>, implementation: Type<T>): this;
  addPrototype<T>(type: ServiceType<T>, callback: ServiceFactoryWithReturnFunction<T>, dependencies?: ServiceType[]): this;
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
      args[1] as ServiceFactoryWithReturnFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehavior.Prototype
    );
  }
}
