import { ServiceProvider } from './provider';
import { ServiceDeclaration } from './declaration';
import { ServiceKey } from './key';
import { Service } from './decorator';
import { ServiceBehaviour } from './behaviour';
import { DecoratorRecorder, isType, Type, ValueCallback } from '../core';
import { ServiceLinearFactoryFunction } from './function-type';

export class ServiceCollection {
  private _includeAllDecorated = false; // include all classes marked with @Service()
  private _includeDependencies = false; // include all dep

  private _data = new Map<ServiceKey, ServiceDeclaration>();
  private _metadata = DecoratorRecorder.classSearch(Service);

  includeAllDecorated(): this {
    this._includeAllDecorated = true;
    return this;
  }

  includeDependencies(): this {
    this._includeDependencies = true;
    return this;
  }

  addAnything(heap: Iterable<Type | ServiceDeclaration | object>): this {
    Array.from(heap).forEach(item => {
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

  addDeclaration(declaration: ServiceDeclaration): this {
    this._data.set(declaration.serviceKey, declaration);
    return this;
  }

  addType<T>(serviceType: Type<T>, serviceKey?: ServiceKey<T>, behaviour?: ServiceBehaviour): this {
    this._addType(serviceType, serviceKey, behaviour);
    return this;
  }

  private _addType<T>(serviceType: Type<T>, serviceKey?: ServiceKey<T>, behaviour?: ServiceBehaviour): ServiceDeclaration {
    if (!behaviour || !serviceKey) {
      const result = this._metadata.filter(x => x.path[0] === serviceType).reverse().reduce((result, {payload}) => {
        if (payload.serviceKey) {
          result.serviceKey = payload.serviceKey;
        }
        if (payload.behaviour) {
          result.behaviour = payload.behaviour;
        }
        return result;
      }, {} as { serviceKey?: ServiceKey, behaviour?: ServiceBehaviour });

      if (!serviceKey && result.serviceKey) { // todo: throw warning that service decorator is different
        serviceKey = result.serviceKey as ServiceKey<T>;
      }

      if (!behaviour && result.behaviour) {
        behaviour = result.behaviour;
      }
    }

    const declaration = ServiceDeclaration.fromType({
      serviceType,
      serviceKey,
      behaviour,
    });

    this.addDeclaration(declaration);
    return declaration;
  }

  addFactory<T>(
    serviceKey: ServiceKey<T>,
    serviceFactory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceKey[] = [],
    behaviour?: ServiceBehaviour,
  ): this {
    return this.addDeclaration(
      ServiceDeclaration.fromFactory({
        serviceKey,
        serviceFactory,
        dependencies,
        behaviour,
      })
    );
  }

  addInstance<T extends object>(serviceInstance: T, serviceKey?: ServiceKey<T>): this {
    return this.addDeclaration(
      ServiceDeclaration.fromInstance({serviceInstance, serviceKey})
    );
  }

  addSingleton<T>(serviceType: Type<T>, serviceKey?: ServiceKey<T>): this {
    return this.addType(serviceType, serviceKey, ServiceBehaviour.Singleton);
  }

  addSingletonFactory<T>(
    serviceKey: ServiceKey<T>,
    serviceFactory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceKey<T>[] = [],
  ): this {
    return this.addFactory(serviceKey, serviceFactory, dependencies, ServiceBehaviour.Singleton);
  }

  addScoped<T>(serviceType: Type<T>, serviceKey?: ServiceKey<T>): this {
    return this.addType(serviceType, serviceKey, ServiceBehaviour.Scoped);
  }

  addScopedFactory<T>(
    serviceKey: ServiceKey<T>,
    serviceFactory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceKey<T>[] = [],
  ): this {
    return this.addFactory(serviceKey, serviceFactory, dependencies, ServiceBehaviour.Scoped);
  }

  addPrototype<T>(serviceType: Type<T>, serviceKey?: ServiceKey<T>): this {
    return this.addType(serviceType, serviceKey, ServiceBehaviour.Prototype);
  }

  addPrototypeFactory<T>(
    serviceKey: ServiceKey<T>,
    serviceFactory: ServiceLinearFactoryFunction<T>,
    dependencies: ServiceKey<T>[] = [],
  ): this {
    return this.addFactory(serviceKey, serviceFactory, dependencies, ServiceBehaviour.Prototype);
  }

  createProvider(): ServiceProvider {
    if (this._includeAllDecorated) { // include @Service() decorated classes
      this._metadata.forEach(decorator => {
        const serviceType = decorator.path[0] as Type;
        const serviceKey = decorator.payload.serviceKey || serviceType;
        if (!this._data.has(serviceKey)) {
          this.addType(serviceType, serviceKey, decorator.payload.behaviour);
        }
      });
    }

    if (this._includeDependencies) {
      const queue = Array.from(this._data).map(x => x[1]);
      while (queue.length) { // todo: probably get factual class and behaviour from decorator.
        const declaration = queue.shift()!;
        declaration.dependencies.filter(dependency => !this._data.has(dependency))
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
  includeAllDecorated = false,
): ServiceProvider {
  const builder = new ServiceCollection();

  if (includeAllDecorated) {
    builder.includeDependencies().includeAllDecorated();
  }

  if (Array.isArray(configure)) {
    builder.addAnything(configure);
  } else {
    configure(builder);
  }

  return builder.createProvider();
}
