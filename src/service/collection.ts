import { ServiceProvider } from './provider';
import { ServiceDeclaration } from './declaration';
import { ServiceType } from './type';
import { Service } from './decorator';
import { ServiceBehaviour } from './behaviour';
import { AbstractType, DecoratorRecorder, doNothing, isType, Type, ValueCallback } from '../core';
import { ServiceLinearFactoryFunction } from './function-type';
import { ServicePreDeclaration } from './pre-declaration';

export class ServiceCollection {
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

  private _data = new Map<ServiceType, ServiceDeclaration>();

  private _preDeclarations: readonly ServicePreDeclaration[] = [];

  constructor(preDeclarations: readonly ServicePreDeclaration[] = []) {
    this._preDeclarations = preDeclarations;
  }

  markToIncludeGlobal(): this {
    this._includeGlobalMark = true;
    return this;
  }

  addAll(iterable: Iterable<Type | ServiceDeclaration | object>): this {
    Array.from(iterable).forEach(item => {
      if (item instanceof ServiceDeclaration) {
        this.addDeclaration(item);
      } else {
        if (isType(item)) {
          this.addType(item);
        } else {
          this.addInstance(item);
        }
      }
    });
    return this;
  }

  addDeclaration(value: ServiceDeclaration): this {
    this._data.set(value.serviceKey, value);
    return this;
  }

  addType<T>(type: Type<T>): this;
  addType<T>(type: ServiceType<T>, implementation: Type<T>, behaviour?: ServiceBehaviour): this;
  addType(...args: unknown[]): this {
    if (args.length === 1) {
      this._addType(args[0] as Type);
    } else {
      this._addType(args[1] as Type, args[0] as ServiceType, args[2] as ServiceBehaviour);
    }
    return this;
  }

  private _addType<T>(serviceType: Type<T>, serviceKey?: ServiceType<T>, behaviour?: ServiceBehaviour): ServiceDeclaration {
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
        }, {} as { key?: ServiceType, behaviour?: ServiceBehaviour });

      if (!serviceKey && result.key) { // todo: throw warning that service decorator is different
        serviceKey = result.key as ServiceType<T>;
      }

      if (!behaviour && result.behaviour) {
        behaviour = result.behaviour;
      }
    }

    const declaration = ServiceDeclaration.fromType({
      serviceType, serviceKey, behaviour,
    });

    this.addDeclaration(declaration);
    return declaration;
  }

  addFactory<T>(
    type: ServiceType<T>,
    factory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceType[] = [],
    behaviour?: ServiceBehaviour,
  ): this {
    return this.addDeclaration(
      ServiceDeclaration.fromFactory({
        serviceKey: type, linearFactory: factory,
        dependencies, behaviour,
      })
    );
  }

  addInstance(object: object): this;
  addInstance<T extends object>(type: ServiceType<T>, object: T): this;
  addInstance(...args: unknown[]): this {
    return this.addDeclaration(
      args.length === 1 ? ServiceDeclaration.fromInstance({
        serviceInstance: args[0] as object,
      }) : ServiceDeclaration.fromInstance({
        serviceInstance: args[1] as object, serviceKey: args[0] as ServiceType<object>,
      })
    );
  }

  addInherited<T>(type: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addInherited<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  addInherited(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehaviour.Inherited);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehaviour.Inherited);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Inherited
    );
  }

  addSingleton<T>(type: Type<T>): this;
  addSingleton<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addSingleton<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  addSingleton(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehaviour.Singleton);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehaviour.Singleton);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Singleton
    );
  }

  addScoped<T>(type: Type<T>): this;
  addScoped<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addScoped<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  addScoped(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehaviour.Scoped);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehaviour.Scoped);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Scoped
    );
  }

  addPrototype<T>(type: Type<T>): this;
  addPrototype<T>(type: AbstractType<T>, implementation: Type<T>): this;
  addPrototype<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  addPrototype(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.addType(type, type, ServiceBehaviour.Prototype);
    }

    if (isType(args[1])) {
      return this.addType(args[0] as AbstractType, args[1], ServiceBehaviour.Prototype);
    }

    return this.addFactory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Prototype
    );
  }

  buildProvider(): ServiceProvider {
    if (this._includeGlobalMark) { // include @Service() decorated classes
      this._preDeclarations.forEach(preDef => {
        if (!this._data.has(preDef.serviceType)) {
          this.addType(preDef.serviceType, preDef.actualType, preDef.behaviour);
        }
      });
    }

    if (this._includeDependenciesMark) {
      const queue = Array.from(this._data).map(x => x[1]);
      while (queue.length) { // todo: probably get factual class and behaviour from decorator.
        const declaration = queue.shift()!;
        declaration.dependencies.filter(dependency => !this._data.has(dependency) && dependency !== ServiceProvider)
          .filter(isType)
          .forEach(dependency => {
            const definition = this._addType(dependency);
            queue.push(definition);
          });
      }
    }

    return new ServiceProvider(Array.from(this._data).map(x => x[1]));
  }
}

export function makeServiceProvider(
  configure: (Type | ServiceDeclaration | object)[] | ValueCallback<ServiceCollection>,
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

  const configurator = new ServiceCollection(preDeclarations);

  if (includeGlobal) {
    configurator.markToIncludeGlobal();
  }

  if (Array.isArray(configure)) {
    configurator.addAll(configure);
  } else {
    configure(configurator);
  }

  const provider = configurator.buildProvider();

  if (preCacheSingleton) {
    Array.from(provider)
      .filter(x => ServiceBehaviour.Singleton === x.behaviour)
      .forEach(x => provider.provide(x.serviceKey, doNothing));
  }

  return provider;
}
