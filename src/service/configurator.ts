import { ServiceProvider } from './provider';
import { ServiceDeclaration } from './declaration';
import { ServiceType } from './type';
import { Service } from './decorator';
import { ServiceBehaviour } from './behaviour';
import { AbstractType, DecoratorRecorder, isType, Type, ValueCallback } from '../core';
import { ServiceLinearFactoryFunction } from './function-type';

/** todo: improve method signatures to make it much easier to use */
export class ServiceConfigurator {
  /**
   * Decides whether all classes decorated with {@link Service} go into {@link ServiceProvider}.
   * @private
   */
  private _includeAllDecorated = false;

  /**
   * Decides whether service dependencies should be included upon {@link ServiceProvider} creation.
   * @private
   */
  private _includeDependencies = true;

  private _data = new Map<ServiceType, ServiceDeclaration>();

  private _metadata = DecoratorRecorder.classSearch(Service);

  includeAll(): this {
    this._includeAllDecorated = true;
    return this;
  }

  addAll(iterable: Iterable<Type | ServiceDeclaration | object>): this {
    Array.from(iterable).forEach(item => {
      if (item instanceof ServiceDeclaration) {
        this.declaration(item);
      } else {
        if (isType(item)) {
          this.add(item);
        } else {
          this.instance(item);
        }
      }
    });
    return this;
  }

  declaration(value: ServiceDeclaration): this {
    this._data.set(value.serviceKey, value);
    return this;
  }

  add<T>(serviceType: Type<T>, serviceKey?: ServiceType<T>, behaviour?: ServiceBehaviour): this {
    this._add(serviceType, serviceKey, behaviour);
    return this;
  }

  private _add<T>(serviceType: Type<T>, serviceKey?: ServiceType<T>, behaviour?: ServiceBehaviour): ServiceDeclaration {
    if (!behaviour || !serviceKey) {
      const result = this._metadata.filter(x => x.path[0] === serviceType).reverse().reduce((result, {payload}) => {
        if (payload.serviceKey) {
          result.key = payload.serviceKey;
        }
        if (payload.behaviour) {
          result.behaviour = payload.behaviour;
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

    this.declaration(declaration);
    return declaration;
  }

  factory<T>(
    type: ServiceType<T>,
    factory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceType[] = [],
    behaviour?: ServiceBehaviour,
  ): this {
    return this.declaration(
      ServiceDeclaration.fromFactory({
        serviceKey: type, linearFactory: factory,
        dependencies, behaviour,
      })
    );
  }

  instance(object: object): this;
  instance<T extends object>(type: ServiceType<T>, object: T): this;
  instance(...args: unknown[]): this {
    return this.declaration(
      args.length === 1 ? ServiceDeclaration.fromInstance({
        serviceInstance: args[0] as object,
      }) : ServiceDeclaration.fromInstance({
        serviceInstance: args[1] as object, serviceKey: args[0] as ServiceType<object>,
      })
    );
  }

  inherited<T>(type: Type<T>): this;
  inherited<T>(type: AbstractType<T>, implementation: Type<T>): this;
  inherited<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  inherited(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.add(type, type, ServiceBehaviour.Inherited);
    }

    if (isType(args[1])) {
      return this.add(args[1], args[0] as AbstractType, ServiceBehaviour.Inherited);
    }

    return this.factory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Inherited
    )
  }

  singleton<T>(type: Type<T>): this;
  singleton<T>(type: AbstractType<T>, implementation: Type<T>): this;
  singleton<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  singleton(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.add(type, type, ServiceBehaviour.Singleton);
    }

    if (isType(args[1])) {
      return this.add(args[1], args[0] as AbstractType, ServiceBehaviour.Singleton);
    }

    return this.factory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Singleton
    )
  }

  scoped<T>(type: Type<T>): this;
  scoped<T>(type: AbstractType<T>, implementation: Type<T>): this;
  scoped<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  scoped(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.add(type, type, ServiceBehaviour.Scoped);
    }

    if (isType(args[1])) {
      return this.add(args[1], args[0] as AbstractType, ServiceBehaviour.Scoped);
    }

    return this.factory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Scoped
    )
  }

  prototype<T>(type: Type<T>): this;
  prototype<T>(type: AbstractType<T>, implementation: Type<T>): this;
  prototype<T>(type: AbstractType<T>, factory: ServiceLinearFactoryFunction<T>, dependencies?: ServiceType[]): this;
  prototype(...args: unknown[]): this {
    if (args.length === 1) {
      const type = args[0] as Type;
      return this.add(type, type, ServiceBehaviour.Prototype);
    }

    if (isType(args[1])) {
      return this.add(args[1], args[0] as AbstractType, ServiceBehaviour.Prototype);
    }

    return this.factory(
      args[0] as AbstractType,
      args[1] as ServiceLinearFactoryFunction<unknown>,
      Array.isArray(args[2]) ? args[2] : [],
      ServiceBehaviour.Prototype
    )
  }

  toProvider(): ServiceProvider {
    if (this._includeAllDecorated) { // include @Service() decorated classes
      this._metadata.forEach(decorator => {
        const serviceType = decorator.path[0] as Type;
        const serviceKey = decorator.payload.serviceKey || serviceType;
        if (!this._data.has(serviceKey)) {
          this.add(serviceType, serviceKey, decorator.payload.behaviour);
        }
      });
    }

    if (this._includeDependencies) {
      const queue = Array.from(this._data).map(x => x[1]);
      while (queue.length) { // todo: probably get factual class and behaviour from decorator.
        const declaration = queue.shift()!;
        declaration.dependencies.filter(dependency => !this._data.has(dependency) && dependency !== ServiceProvider)
          .filter(isType)
          .forEach(dependency => {
            const definition = this._add(dependency);
            queue.push(definition);
          });
      }
    }

    return new ServiceProvider(Array.from(this._data).map(x => x[1]));
  }
}

export function configureProvider(
  configure: (Type | ServiceDeclaration | object)[] | ValueCallback<ServiceConfigurator>,
  includeAllDecorated = false,
): ServiceProvider {
  const configurator = new ServiceConfigurator();

  if (includeAllDecorated) {
    configurator.includeAll();
  }

  if (Array.isArray(configure)) {
    configurator.addAll(configure);
  } else {
    configure(configurator);
  }

  return configurator.toProvider();
}
