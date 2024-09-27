import {
  AbstractType,
  DecoratorRecorder,
  FunctionClass,
  isType,
  MapCallback,
  MaybePromise,
  returnSelf,
  Type
} from '../core';
import { ServiceFactoryFunction, ServiceFactoryReturnFunction } from './function';
import { ServiceType } from './type';
import { Provide } from './decorator';
import 'reflect-metadata';

export abstract class ServiceFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _dependencies: readonly ServiceType[];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  protected constructor(callback: ServiceFactoryFunction<T>, dependencies: readonly ServiceType[]) {
    super(callback);
    this._dependencies = dependencies;
  }
}

/**
 * @deprecated not implemented yet, only draft, only idea
 */
export class LateServiceFactory<T = unknown> extends ServiceFactory<[Type<T>, T]> {
  private readonly _original: ServiceFactory<T>;

  get original(): ServiceFactory<T> {
    return this._original;
  }

  constructor(original: ServiceFactory<T>) {
    super((provide, callback2) => {
      return original(provide, result => {
        if (typeof result === 'object' && null !== result && isType(result.constructor)) {
          return callback2([result.constructor as Type, result]);
        }

        throw new Error('late factory failed. result ought to be object which constructor is gotten as a service type. actual: '+result);
      });
    }, original.dependencies);
    this._original = original;
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

export class ServiceFactoryReturn<T> extends ServiceFactory<T> {
  private readonly _factory: ServiceFactoryReturnFunction<T>;

  get factory(): ServiceFactoryReturnFunction<T> {
    return this._factory;
  }

  constructor(factory: ServiceFactoryReturnFunction<T>, dependencies: readonly ServiceType[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.all(dependencies)(provide, args => {
        MaybePromise.then(() => factory(...args), callback);
      });
    }, dependencies);
    this._factory = factory;
  }
}

export interface TargetParameter<T = unknown> {
  readonly original: AbstractType;
  readonly type: ServiceType<T>;
  readonly callback: MapCallback<T, MaybePromise<unknown>>;
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
      ).map((type: AbstractType) => ({ original: type, type, callback: returnSelf }));

      if (callback.length && callback.length !== reflect.length) {
        throw new Error(`Decorator metadata has not been emitted: ` + callback.length);
      }

      parameters = DecoratorRecorder.parameterSearch(Provide, type, propertyKey).reduce((result, decoration) => {
        const substitution = result[decoration.path[2]] as Writeable<TargetParameter>;
        if (decoration.payload.referTo) {
          substitution.type = decoration.payload.referTo;
        }
        substitution.callback = decoration.payload.callback;
        return result;
      }, reflect);

      factory = (provide, callback) => {
        ServiceFactoryFunction.all(parameters.map(x => x.type))(provide, args => {
          MaybePromise.all(() => args.map((x, index) => parameters[index].callback(x)), args2 => {
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
  private _type: Type<T>;
  private _parameters: ServiceFactoryFunction<ConstructorParameters<Type<T>>>;

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
  private _type: Type<T>;
  private _propertyKey: string | symbol;
  private _parameters: ServiceFactoryFunction<ConstructorParameters<Type<T>>>;

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
          MaybePromise.then(() => {
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
