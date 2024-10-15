import { FunctionClass, MaybePromiseLike, Type, ValueCallback } from '../core';
import { ServiceType } from './service-type';
import { Provide } from './provide';
import type { ServiceProvideCallback } from './service-provider';

export type ServiceFactoryCallback<T = unknown> = (provide: ServiceProvideCallback, callback: ValueCallback<T>) => void;

export type ServiceFactoryFunction<R, P extends unknown[] = any[]> = (...args: P) => MaybePromiseLike<R>;

export namespace ServiceFactoryCallback {
  export function all(array: readonly ServiceType[]): ServiceFactoryCallback<unknown[]> {
    return (provide: ServiceProvideCallback, callback: ValueCallback<unknown[]>) => {
      if (!array.length) {
        return callback([]);
      }

      const args = new Array(array.length);
      let resolved = 0;
      array.forEach((key, index) => {
        provide(key, result => {
          args[index] = result;
          resolved++;
          if (resolved >= args.length) {
            callback(args);
          }
        });
      });
    };
  }
}

export class ServiceFactory<T> extends FunctionClass<ServiceFactoryCallback<T>> {
  private readonly _dependencies: readonly ServiceType[];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  constructor(callback: ServiceFactoryCallback<T>, dependencies: readonly ServiceType[]) {
    super(callback);
    this._dependencies = dependencies;
  }
}

export class ValueFactory<T> extends ServiceFactory<T> {
  private readonly _value: T;

  get value(): T {
    return this._value;
  }

  constructor(value: T) {
    super((_, callback) => callback(value), []);
    this._value = value;
  }
}

export class ServiceFactoryWithReturn<T> extends ServiceFactory<T> {
  private readonly _original: ServiceFactoryFunction<T>;

  get original(): ServiceFactoryFunction<T> {
    return this._original;
  }

  constructor(factory: ServiceFactoryFunction<T>, dependencies: readonly ServiceType[] = []) {
    super((provide, callback) => {
      ServiceFactoryCallback.all(dependencies)(provide, args => {
        MaybePromiseLike.then(() => factory(...args), callback);
      });
    }, dependencies);
    this._original = factory;
  }
}

export class TargetParametersFactory extends ServiceFactory<unknown[]> {
  private static _cache = new Map<Function, ServiceFactory<unknown[]>>;

  private readonly _type: Type;

  get type(): Type {
    return this._type;
  }

  private readonly _propertyKey: string | symbol | undefined;

  get propertyKey(): string | symbol | undefined {
    return this._propertyKey;
  }

  constructor(type: Type, propertyKey?: string | symbol) {
    const callback = undefined === propertyKey ? type : type.prototype[propertyKey];
    let serviceFactory = TargetParametersFactory._cache.get(callback);

    if (!serviceFactory) {
      serviceFactory = Provide.factoryCut(propertyKey ? [type, propertyKey] : type);
      TargetParametersFactory._cache.set(callback, serviceFactory);
    }

    super(serviceFactory, serviceFactory.dependencies);
    this._type = type;
    this._propertyKey = propertyKey;
  }
}

export class TypeFactory<T = unknown> extends ServiceFactory<T> {
  private readonly _type: Type<T>;

  get type(): Type<T> {
    return this._type;
  }

  private readonly _parameters: ServiceFactoryCallback<ConstructorParameters<Type<T>>>;

  get parameters(): ServiceFactoryCallback<ConstructorParameters<Type<T>>> {
    return this._parameters;
  }

  constructor(type: Type<T>) {
    let parameters: ServiceFactory<ConstructorParameters<Type<T>>>;

    if (!type.length) {
      parameters = new ValueFactory([]);
    } else {
      parameters = new TargetParametersFactory(type);
    }

    super((provide, callback) => {
      parameters(provide, args => callback(new type(...args)));
    }, parameters.dependencies);

    this._type = type;
    this._parameters = parameters;
  }
}

export class ObjectMethodFactory<T> extends ServiceFactory<unknown> {
  private readonly _type: Type<T>;

  get type(): Type<T> {
    return this._type;
  }

  private readonly _propertyKey: string | symbol;

  get propertyKey(): string | symbol {
    return this._propertyKey;
  }

  // todo: refactor type
  private readonly _parameters: ServiceFactoryCallback<ConstructorParameters<Type<T>>>;

  get parameters(): ServiceFactoryCallback<ConstructorParameters<Type<T>>> {
    return this._parameters;
  }

  constructor(type: Type<T>, propertyKey: string | symbol) {
    const callback = (type.prototype as any)[propertyKey] as Function;
    let parameters: ServiceFactory<ConstructorParameters<Type<T>>>;

    if (!callback.length) {
      parameters = new ValueFactory([]);
    } else {
      parameters = new TargetParametersFactory(type, propertyKey);
    }

    super((provide, callback) => {
      provide(type, object => {
        parameters(provide, args => {
          MaybePromiseLike.then(() => {
            return ((object as any)[propertyKey] as Function).apply(object, args);
          }, callback);
        });
      });
    }, parameters.dependencies);

    this._type = type;
    this._propertyKey = propertyKey;
    this._parameters = parameters;
  }
}
