import {
  AbstractType,
  DecoratorRecorder,
  FunctionClass,
  MapCallback,
  MaybePromiseLike,
  Type,
  ValueCallback
} from '../core';
import { ServiceType } from './service-type';
import { Provide } from './decorators';
import type { ServiceProvideFunction } from './service-provider';
import 'reflect-metadata';

export type ServiceFactoryFunction<T = unknown> = (provide: ServiceProvideFunction, callback: ValueCallback<T>) => void;

export type ServiceFactoryWithReturnFunction<R, P extends unknown[] = any[]> = (...args: P) => MaybePromiseLike<R>;

export namespace ServiceFactoryFunction {
  export function all(array: readonly ServiceType[]): ServiceFactoryFunction<unknown[]> {
    return (provide: ServiceProvideFunction, callback: ValueCallback<unknown[]>) => {
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

export abstract class ServiceFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  readonly #dependencies: readonly ServiceType[];

  get dependencies(): readonly ServiceType[] {
    return this.#dependencies;
  }

  protected constructor(callback: ServiceFactoryFunction<T>, dependencies: readonly ServiceType[]) {
    super(callback);
    this.#dependencies = dependencies;
  }
}

export class ValueFactory<T> extends ServiceFactory<T> {
  readonly #value: T;

  get value(): T {
    return this.#value;
  }

  constructor(value: T) {
    super((_, callback) => callback(value), []);
    this.#value = value;
  }
}

export class ServiceFactoryWithReturn<T> extends ServiceFactory<T> {
  private readonly _original: ServiceFactoryWithReturnFunction<T>;

  get original(): ServiceFactoryWithReturnFunction<T> {
    return this._original;
  }

  constructor(factory: ServiceFactoryWithReturnFunction<T>, dependencies: readonly ServiceType[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.all(dependencies)(provide, args => {
        MaybePromiseLike.then(() => factory(...args), callback);
      });
    }, dependencies);
    this._original = factory;
  }
}

export interface TargetParameter<T = unknown> {
  readonly original: AbstractType;
  readonly type: ServiceType<T>;
  readonly callback: MapCallback<T, MaybePromiseLike<unknown>>;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export class TargetParametersFactory extends ServiceFactory<unknown[]> implements Iterable<TargetParameter> {
  private static _cache = new Map<Function, [readonly TargetParameter[], ServiceFactoryFunction<unknown[]>]>;

  private readonly _type: Type;

  get type(): Type {
    return this._type;
  }

  private readonly _propertyKey: string | symbol | undefined;

  get propertyKey(): string | symbol | undefined {
    return this._propertyKey;
  }

  private readonly _parameters: readonly TargetParameter[];

  constructor(type: Type, propertyKey?: string | symbol) {
    const callback = undefined === propertyKey ? type : type.prototype[propertyKey];
    let parameters: readonly TargetParameter[], factory: ServiceFactoryFunction<unknown[]>;

    if (TargetParametersFactory._cache.has(callback)) {
      [parameters, factory] = TargetParametersFactory._cache.get(callback)!;
    } else {
      const reflect: TargetParameter[] = (
        (
          propertyKey ?
            Reflect.getMetadata('design:paramtypes', type.prototype, propertyKey) :
            Reflect.getMetadata('design:paramtypes', type)
        ) || []
      ).map((type: AbstractType) => ({ original: type, type, callback: (object: unknown) => object }));

      if (callback.length && callback.length !== reflect.length) {
        throw new Error(`Decorator metadata has not been emitted: ` + callback.length);
      }

      parameters = DecoratorRecorder.parameterSearch(Provide, type, propertyKey).reduce((result, decoration) => {
        const substitution = result[decoration.path[2]] as Writeable<TargetParameter>;
        if (decoration.payload.type) {
          substitution.type = decoration.payload.type;
        }
        substitution.callback = decoration.payload.project;
        return result;
      }, reflect);

      factory = (provide, callback) => {
        ServiceFactoryFunction.all(parameters.map(x => x.type))(provide, args => {
          MaybePromiseLike.all(() => args.map((x, index) => parameters[index].callback(x)), args2 => {
            args2.forEach((arg, index) => { // todo: refactor in a cool way
              if (!(arg instanceof parameters[index].original) && (arg as any).constructor !== parameters[index].original) {
                console.warn(`Possibly type issue. ${type.name}#constructor([${index}]: ${parameters[index].original.name}). Actual: ${(arg as any).constructor.name}`);
              }
            });

            callback(args2);
          });
        });
      };

      TargetParametersFactory._cache.set(callback, [parameters, factory]);
    }

    super(factory, parameters.map(p => p.type));
    this._type = type;
    this._propertyKey = propertyKey;
    this._parameters = parameters;
  }

  [Symbol.iterator](): Iterator<TargetParameter> {
    return this._parameters[Symbol.iterator]();
  }
}

export class TypeFactory<T = unknown> extends ServiceFactory<T> {
  private readonly _type: Type<T>;

  get type(): Type<T> {
    return this._type;
  }

  private readonly _parameters: ServiceFactoryFunction<ConstructorParameters<Type<T>>>;

  get parameters(): ServiceFactoryFunction<ConstructorParameters<Type<T>>> {
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
  private readonly _parameters: ServiceFactoryFunction<ConstructorParameters<Type<T>>>;

  get parameters(): ServiceFactoryFunction<ConstructorParameters<Type<T>>> {
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
