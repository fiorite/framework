import { ServiceProvider } from './provider';
import { ServiceDescriptor } from './descriptor';
import { ServiceType } from './type';
import { Service } from './decorator';
import { ServiceBehavior } from './behavior';
import {
  AbstractType,
  CustomSet,
  DecoratorRecorder,
  doNothing,
  FunctionClass,
  isType,
  Type,
  ValueCallback
} from '../core';
import { ServiceFactoryReturnFunction } from './function';
import { ServicePreDeclaration } from './pre-declaration';

export class ServiceSet extends CustomSet<ServiceDescriptor, ServiceType> {
  get [Symbol.toStringTag](): string {
    return 'ServiceSet';
  }

  /**
   * Decides whether all classes decorated with {@link Service} go into {@link ServiceProvider}.
   * @private
   */
  private _includeGlobalMark = false;

  /**
   * Decides whether service dependencies should be included upon {@link ServiceProvider} creation.
   * @private
   */
  private _includeDependenciesMark = true;

  private _preDeclarations: readonly ServicePreDeclaration[] = [];

  constructor(preDeclarations: readonly ServicePreDeclaration[] = []) {
    const getServiceType = (def: ServiceDescriptor) => def.type;
    super(getServiceType);
    this._preDeclarations = preDeclarations;
  }

  markToIncludeGlobal(): this {
    this._includeGlobalMark = true;
    return this;
  }

  useProject(): void {
    throw new Error('Not implemented.');
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

  addType<T>(type: Type<T>): this;
  addType<T>(type: ServiceType<T>, actual: Type<T>, behaviour?: ServiceBehavior): this;
  addType(...args: unknown[]): this {
    if (args.length === 1) {
      this._addType(args[0] as Type);
    } else {
      this._addType(args[1] as Type, args[0] as ServiceType, args[2] as ServiceBehavior);
    }
    return this;
  }

  private _addType<T>(serviceType: Type<T>, serviceKey?: ServiceType<T>, behaviour?: ServiceBehavior): ServiceDescriptor {
    if (!behaviour || !serviceKey) {
      const result = this._preDeclarations
        .filter(x => x.actualType === serviceType)
        .reverse()
        .reduce((result, preDef) => {
          if (preDef.serviceType) {
            result.key = preDef.serviceType;
          }
          if (preDef.behaviour) {
            result.behaviour = preDef.behaviour;
          }
          return result;
        }, {} as { key?: ServiceType, behaviour?: ServiceBehavior });

      if (!serviceKey && result.key) { // todo: throw warning that service decorator is different
        serviceKey = result.key as ServiceType<T>;
      }

      if (!behaviour && result.behaviour) {
        behaviour = result.behaviour;
      }
    }

    const declaration = ServiceDescriptor.type(serviceKey || serviceType, serviceType, behaviour);

    this.add(declaration);
    return declaration;
  }

  addFactory<T>(
    type: ServiceType<T>,
    factory: ServiceFactoryReturnFunction<T>,
    dependencies: ServiceType[] = [],
    behaviour?: ServiceBehavior,
  ): this {
    const descriptor = ServiceDescriptor.factory(type, factory, dependencies, behaviour);
    return this.add(descriptor);
  }

  addValue(object: object): this;
  addValue<T extends object>(serviceType: ServiceType<T>, object: T): this;
  addValue(...args: unknown[]): this {
    return this.add(
      args.length === 1 ? ServiceDescriptor.value(args[0] as object) :
        ServiceDescriptor.value(args[0] as ServiceType<object>, args[1] as object)
    );
  }

  addInherited<T>(type: Type<T>): this;
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

  addSingleton<T>(type: Type<T>): this;
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

  addScoped<T>(type: Type<T>): this;
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

  addPrototype<T>(type: Type<T>): this;
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

  toProvider(): ServiceProvider {
    if (this._includeGlobalMark) { // include @Service() decorated classes
      this._preDeclarations.forEach(preDef => {
        if (!this[CustomSet.data].has(preDef.serviceType)) {
          this.addType(preDef.serviceType, preDef.actualType, preDef.behaviour);
        }
      });
    }

    if (this._includeDependenciesMark) {
      const queue = Array.from(this);
      while (queue.length) { // todo: probably get factual class and behaviour from decorator.
        const declaration = queue.shift()!;
        declaration.dependencies.filter(dependency => !this[CustomSet.data].has(dependency) && dependency !== ServiceProvider)
          .filter(isType)
          .forEach(dependency => {
            const definition = this._addType(dependency);
            queue.push(definition);
          });
      }
    }

    return new ServiceProvider(Array.from(this));
  }
}

export function makeServiceProvider(
  configure: Iterable<Type | ServiceDescriptor | object> | ValueCallback<ServiceSet>,
  includeGlobal = false,
  preCacheSingleton = false,
): ServiceProvider {
  const preDeclarations = DecoratorRecorder.classSearch(Service).map(decorator => {
    const payload = decorator.payload;
    const actualType = decorator.path[0] as Type;
    const serviceType = payload.type || actualType;
    return new ServicePreDeclaration({
      actualType, serviceType, behaviour: payload.behaviour,
    });
  });

  const configurator = new ServiceSet(preDeclarations);

  if (includeGlobal) {
    configurator.markToIncludeGlobal();
  }

  if ('function' === typeof configure) {
    configure(configurator);
  } else {
    configurator.addAll(configure);
  }

  const provider = configurator.toProvider();

  if (preCacheSingleton) {
    Array.from(provider)
      .filter(x => ServiceBehavior.Singleton === x.behavior)
      .forEach(x => provider.provide(x.type, doNothing));
  }

  return provider;
}

/** @deprecated experimental API */
export class ServiceExtension extends FunctionClass<ValueCallback<ServiceSet>> {
  constructor(callback: ValueCallback<ServiceSet>) {
    super(callback);
  }
}
