import {
  DecoratorRecorder,
  AbstractType,
  arraySequenceEqual,
  FunctionClass,
  MapCallback,
  MapWithKeyComparer,
  MaybePromise,
  propertyNotFound,
  Type,
  ValueCallback,
} from '../core';
import { ServiceType } from './service-type';
import { ServiceFactoryFunction, ServiceProvideFunction } from './function';
import { Provide } from './decorator';
import 'reflect-metadata';

interface ParamSubstitution {
  readonly serviceKey: ServiceType;
  readonly callback: MapCallback<unknown, unknown>;
  readonly paramType: AbstractType;
}

type SubstituteResult = [paramFactory: ServiceFactoryFunction<unknown[]>, dependencies: ServiceType[]];
const flyweight = new MapWithKeyComparer<[type: Type, propertyKey?: string | symbol], SubstituteResult>(arraySequenceEqual);

function substituteParameters(type: Type, propertyKey?: string | symbol): SubstituteResult {
  const entryKey: [type: Type, propertyKey?: string | symbol] = [type, propertyKey];

  if (flyweight.has(entryKey)) {
    return flyweight.get(entryKey);
  }

  const parameters: ParamSubstitution[] = (
    (
      propertyKey ?
        Reflect.getMetadata('design:paramtypes', type.prototype, propertyKey) :
        Reflect.getMetadata('design:paramtypes', type)
    ) || []
  ).map((paramType: AbstractType) => ({
    serviceKey: paramType,
    callback: (x: unknown) => x,
    paramType,
  }));

  if (!parameters.length) {
    throw new Error(`Decorator metadata has not been emitted: ` + type.name);
  }

  const substitution = DecoratorRecorder.parameterSearch(Provide, type, propertyKey).reduce((result, decoration) => {
    const substitution = result[decoration.path[2]] as any;
    if (decoration.payload.referTo) {
      substitution.serviceKey = decoration.payload.referTo;
    }
    substitution.callback = decoration.payload.callback;
    return result;
  }, parameters);

  const factory: ServiceFactoryFunction = (provide, callback) => {
    ServiceFactoryFunction.from(substitution.map(x => x.serviceKey))(provide, args => {
      MaybePromise.all(() => args.map((x, index) => substitution[index].callback(x)), args2 => {
        args2.forEach((arg, index) => { // todo: refactor in a cool way
          if (!(arg instanceof substitution[index].paramType) && (arg as any).constructor !== substitution[index].paramType) {
            console.warn(`Possibly type issue. ${type.name}#constructor([${index}]: ${substitution[index].paramType.name}). Actual: ${(arg as any).constructor.name}`);
          }
        });

        callback(args2);
      });
    });
  };

  const result = [factory, substitution.map(x => x.serviceKey)] as SubstituteResult;
  flyweight.set(entryKey, result);
  return result;
}

export class _ServiceClassResolver<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private static readonly _flyweight = new Map<Type, _ServiceClassResolver<unknown>>();

  private readonly _dependencies: ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  static from<T>(classType: Type<T>): _ServiceClassResolver<T> {
    if (this._flyweight.has(classType)) {
      return this._flyweight.get(classType) as _ServiceClassResolver<T>;
    }

    const classResolver = new _ServiceClassResolver(classType);
    this._flyweight.set(classType, classResolver);
    return classResolver;
  }

  private constructor(readonly classType: Type<T>) {
    let factoryFn: ServiceFactoryFunction<T>;
    let dependencies: ServiceType[] = [];

    if (!classType.length) {
      factoryFn = (_, callback) => callback(new classType());
    } else {
      const [paramFactory, _dependencies] = substituteParameters(classType);

      factoryFn = (provide, callback) => {
        paramFactory(provide, args => {
          callback(new classType(...args));
        });
      };

      dependencies = _dependencies;
    }

    super(factoryFn);
    this._dependencies = dependencies;
  }
}

export type ServiceMethodResolveFunction<T, R> = (instance: T, provide: ServiceProvideFunction, callback: ValueCallback<R>) => void;

export class _ServiceMethodResolver<T, R> extends FunctionClass<ServiceMethodResolveFunction<T, R>> {
  private static readonly _flyweight = new MapWithKeyComparer<[Type, string | symbol], _ServiceMethodResolver<unknown, unknown>>(arraySequenceEqual);

  private readonly _dependencies: ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  static from<T, R>(classType: Type<T>, propertyKey: string | symbol): _ServiceMethodResolver<T, R> {
    const combinedKey = [classType, propertyKey] as [Type, string | symbol];
    if (this._flyweight.has(combinedKey)) {
      return this._flyweight.get(combinedKey) as _ServiceMethodResolver<T, R>;
    }

    const methodResolver = new _ServiceMethodResolver(classType, propertyKey);
    this._flyweight.set(combinedKey, methodResolver);
    return methodResolver as _ServiceMethodResolver<T, R>;
  }

  private constructor(readonly classType: Type, readonly propertyKey: string | symbol) {
    let factoryFn: ServiceMethodResolveFunction<T, R>;
    let dependencies: ServiceType[] = [];

    let classMethod = Object.getOwnPropertyDescriptor(classType.prototype, propertyKey)!;

    if (!classMethod) {
      throw propertyNotFound(`Property "${propertyKey.toString()}" is not found in "${classType.name}".`);
    }

    if (typeof classMethod.value !== 'function') {
      throw new Error(`Property "${propertyKey.toString()}" in "${classType.name}" is not method.`); // todo: add error
    }

    if (!classMethod.value.length) {
      factoryFn = (instance, _, callback) => callback(classMethod.value.apply(instance));
    } else {
      const [paramFactory, _dependencies] = substituteParameters(classType, propertyKey);


      factoryFn = (object, provide, callback) => {
        paramFactory(provide, args => {
          callback(classMethod.value.apply(object, args));
        });
      };

      dependencies = _dependencies;
    }

    super(factoryFn);
    this._dependencies = dependencies;
  }
}
