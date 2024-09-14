import {
  AbstractType,
  arraySequenceEqual,
  _DecoratorRecorder,
  FunctionClass,
  MapCallback,
  MapWithKeyComparer,
  MaybePromise,
  propertyNotFound,
  Type,
  ValueCallback,
} from '../core';
import { ServiceKey } from './key';
import { ServiceFactoryFunction, ServiceProvideFunction } from './function-type';
import { Provide } from './decorator';
import 'reflect-metadata';

interface ParamSubstitution {
  readonly serviceKey: ServiceKey;
  readonly callback: MapCallback<unknown, unknown>;
  readonly paramType: AbstractType;
}

const reflectLightweight = new MapWithKeyComparer<[type: Type, propertyKey?: string | symbol], ParamSubstitution[]>(arraySequenceEqual);

function defineSubstitution(type: Type, propertyKey?: string | symbol): ParamSubstitution[] {
  const entryKey: [type: Type, propertyKey?: string | symbol] = [type, propertyKey];

  if (reflectLightweight.has(entryKey)) {
    return reflectLightweight.get(entryKey);
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

  const result = _DecoratorRecorder.parameterSearch(Provide, type, propertyKey).reduce((result, decoration) => {
    const substitution = result[decoration.path[2]] as any;
    if (decoration.payload.referTo) {
      substitution.serviceKey = decoration.payload.referTo;
    }
    substitution.callback = decoration.payload.callback;
    return result;
  }, parameters);

  reflectLightweight.set(entryKey, result);
  return result;
}

export class ServiceClassResolver<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private static readonly _lightweight = new Map<Type, ServiceClassResolver<unknown>>();

  private readonly _dependencies: ServiceKey[] = [];

  get dependencies(): readonly ServiceKey[] {
    return this._dependencies;
  }

  static useLightweight<T>(classType: Type<T>): ServiceClassResolver<T> {
    if (this._lightweight.has(classType)) {
      return this._lightweight.get(classType) as ServiceClassResolver<T>;
    }

    const classResolver = new ServiceClassResolver(classType);
    this._lightweight.set(classType, classResolver);
    return classResolver;
  }

  private constructor(readonly classType: Type<T>) {
    let parametersProvider: ServiceFactoryFunction<unknown[]>;
    let factoryFn: ServiceFactoryFunction<T>;
    let dependencies: ServiceKey[] = [];

    if (!classType.length) {
      factoryFn = (_, callback) => callback(new classType());
      parametersProvider = (_, callback) => callback([]);
    } else {
      const substitution = defineSubstitution(classType);

      if (!substitution.length) {
        throw new Error(`Decorator metadata has not been emitted: ` + classType.name);
      }

      parametersProvider = (provide, callback) => {
        ServiceFactoryFunction.from(substitution.map(x => x.serviceKey))(provide, args => {
          MaybePromise.all(() => args.map((x, index) => substitution[index].callback(x)), args2 => {
            args2.forEach((arg, index) => { // todo: refactor in a cool way
              if (!(arg instanceof substitution[index].paramType) && (arg as any).constructor !== substitution[index].paramType) {
                console.warn(`Possibly type issue. ${classType.name}#constructor([${index}]: ${substitution[index].paramType.name}). Actual: ${(arg as any).constructor.name}`);
              }
            });

            callback(args2);
          });
        });
      };

      factoryFn = (provide, callback) => {
        parametersProvider(provide, args => {
          callback(new classType(...args));
        });
      };

      dependencies = substitution.map(x => x.serviceKey);
    }

    super(factoryFn);
    this._dependencies = dependencies;
  }
}

export type ServiceMethodResolveFunction<T, R> = (instance: T, provide: ServiceProvideFunction, callback: ValueCallback<R>) => void;

export class ServiceMethodResolver<T, R> extends FunctionClass<ServiceMethodResolveFunction<T, R>> {
  private static readonly _lightweight = new MapWithKeyComparer<[Type, string | symbol], ServiceMethodResolver<unknown, unknown>>(arraySequenceEqual);

  private readonly _dependencies: ServiceKey[] = [];

  get dependencies(): readonly ServiceKey[] {
    return this._dependencies;
  }

  static useLightweight<T, R>(classType: Type<T>, propertyKey: string | symbol): ServiceMethodResolver<T, R> {
    const combinedKey = [classType, propertyKey] as [Type, string | symbol];
    if (this._lightweight.has(combinedKey)) {
      return this._lightweight.get(combinedKey) as ServiceMethodResolver<T, R>;
    }

    const methodResolver = new ServiceMethodResolver(classType, propertyKey);
    this._lightweight.set(combinedKey, methodResolver);
    return methodResolver as ServiceMethodResolver<T, R>;
  }

  private constructor(readonly classType: Type, readonly propertyKey: string | symbol) {
    let parametersProvider: ServiceFactoryFunction<unknown[]>;
    let factoryFn: ServiceMethodResolveFunction<T, R>;
    let dependencies: ServiceKey[] = [];

    let classMethod = Object.getOwnPropertyDescriptor(classType.prototype, propertyKey)!;

    if (!classMethod) {
      throw propertyNotFound(`Property "${propertyKey.toString()}" is not found in "${classType.name}".`);
    }

    if (typeof classMethod.value !== 'function') {
      throw new Error(`Property "${propertyKey.toString()}" in "${classType.name}" is not method.`); // todo: add error
    }

    if (!classMethod.value.length) {
      parametersProvider = (_, callback) => callback([]);
      factoryFn = (instance, _, callback) => callback(classMethod.value.apply(instance));
    } else {
      const substitution = defineSubstitution(classType, propertyKey);

      if (!substitution.length) {
        throw new Error(`Decorator metadata has not been emitted`);
      }

      parametersProvider = (provide, callback) => {
        ServiceFactoryFunction.from(substitution.map(x => x.serviceKey))(provide, args => {
          MaybePromise.all(() => args.map((x, index) => substitution[index].callback(x)), args2 => {
            args2.forEach((arg, index) => { // todo: refactor in a cool way
              if (!(arg instanceof substitution[index].paramType) && (arg as any).constructor !== substitution[index].paramType) {
                console.warn(`Possibly type issue. ${classType.name}#constructor([${index}]: ${substitution[index].paramType.name}). Actual: ${(arg as any).constructor.name}`);
              }
            });

            callback(args2);
          });
        });
      };

      factoryFn = (object, provide, callback) => {
        parametersProvider(provide, args => {
          callback(classMethod.value.apply(object, args));
        });
      };

      dependencies = substitution.map(x => x.serviceKey);
    }

    super(factoryFn);
    this._dependencies = dependencies;
  }
}
