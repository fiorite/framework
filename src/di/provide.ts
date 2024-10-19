import {
  Context,
  DecoratorRecorder,
  FunctionClass,
  makeParameterDecorator,
  MapCallback,
  MaybeOptional,
  MaybeOptionalValue,
  MaybePromiseLike,
  OptionalMarker,
  OptionalModifier,
  ParameterDecoratorWithPayload,
  reflectTargetTypes,
  Type,
  ValueCallback,
  VoidCallback
} from '../core';
import { ServiceType } from './type';
import { ServiceProvider } from './provider';

// const defaultImplementation: ServiceProvideCallback = () => {
//   throw new Error('provide() is not implemented yet.');
// };

/**
 * New Angular gave an idea to put this thing here.
 * However, there no chance to bind `provide()` to request context.
 * Thus, this feature is only limited for unscoped providers and, perhaps, two and more apps
 * using it will get an error upon concurrent call.
 * Also, promise-based services require callback to be added.
 * Error can appear in runtime, moving async -> sync can cause an error.
 * Use it if you have test coverage and are able to track an issue.
 * Tips:
 * - Use for class constructor and methods (HTTP route handlers)
 * - Use for a single application and global services (non-scoped).
 * - Test cases will become more complex, use on your consideration.
 * There a chance, in the future, to get a better understanding on improvements.
 */

let providerImplementation: ServiceProvider | undefined;

export function provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
export function provide<T>(type: OptionalMarker<ServiceType<T>>, callback: ValueCallback<T | undefined>): void;
export function provide<T>(type: MaybeOptional<ServiceType<T>>, callback: ValueCallback<MaybeOptionalValue<typeof type, T>>): void;
export function provide<T>(type: ServiceType<T>): T;
export function provide<T>(type: OptionalMarker<ServiceType<T>>): T | undefined;
export function provide<T>(type: MaybeOptional<ServiceType<T>>): MaybeOptionalValue<typeof type, T>;
export function provide<T>(context: Context, type: ServiceType<T>, callback: ValueCallback<T>): void;
export function provide<T>(context: Context, type: OptionalMarker<ServiceType<T>>, callback: ValueCallback<T | undefined>): void;
export function provide<T>(context: Context, type: MaybeOptional<ServiceType<T>>, callback: ValueCallback<MaybeOptionalValue<typeof type, T>>): void;
export function provide<T>(context: Context, type: ServiceType<T>): T;
export function provide<T>(context: Context, type: OptionalMarker<ServiceType<T>>): T | undefined;
export function provide<T>(context: Context, type: MaybeOptional<ServiceType<T>>): MaybeOptionalValue<typeof type, T>;
export function provide(...args: unknown[]) {
  if (args.length > 1 && args[0] instanceof Context) {
    return args.length > 2 ?
      (args[0] as Context).get(ServiceProvider).get(args[1] as MaybeOptional<ServiceType>, args[2] as ValueCallback<unknown>) :
      (args[0] as Context).get(ServiceProvider).get(args[1] as MaybeOptional<ServiceType>);
  }

  if (!providerImplementation) {
    throw new Error('provide() unable to locate ServiceProvider (not being set yet).');
  }

  return args.length > 1 ?
    providerImplementation.get(args[0] as MaybeOptional<ServiceType>, args[1] as ValueCallback<unknown>) :
    providerImplementation.get(args[0] as MaybeOptional<ServiceType>);
}

export function provideAsync<T>(type: ServiceType<T>): PromiseLike<T>;
export function provideAsync<T>(type: OptionalMarker<ServiceType<T>>): PromiseLike<T | undefined>;
export function provideAsync<T>(type: MaybeOptional<ServiceType<T>>): PromiseLike<MaybeOptionalValue<typeof type, T>>;
export function provideAsync<T>(context: Context, type: ServiceType<T>): PromiseLike<T>;
export function provideAsync<T>(context: Context, type: OptionalMarker<ServiceType<T>>): PromiseLike<T | undefined>;
export function provideAsync<T>(context: Context, type: MaybeOptional<ServiceType<T>>): PromiseLike<MaybeOptionalValue<typeof type, T>>;
export function provideAsync(...args: unknown[]) {
  if (args.length === 2) {
    return (args[0] as Context).get(ServiceProvider).getAsync(args[1] as MaybeOptional<ServiceType>);
  }

  if (!providerImplementation) {
    throw new Error('provide() unable to locate ServiceProvider (not being set yet).');
  }

  return providerImplementation.getAsync(args[0] as ServiceType);
}

let occupyCallers = 0;

export function occupyProvide(provider: ServiceProvider, callback: (done: VoidCallback) => void): void {
  let done = false;
  const complete = () => {
    if (!done) {
      occupyCallers--;
      if (occupyCallers <= 0) {
        providerImplementation = undefined;
      }
      done = true;
    }
  };

  const implementation = provider;

  if (providerImplementation === implementation) {
    occupyCallers++;
    try {
      callback(complete);
    } catch (err) {
      complete();
      throw err;
    }
  } else {
    if (occupyCallers > 0) {
      throw new Error(`Implementation has been busy (clients: ${occupyCallers}). Consider using this feature in single app.`);
    }

    if (provider.scopeContainer) {
      throw new Error('Unable to use Scoped provider implementation. To avoid sharing context of particular client.');
    }

    providerImplementation = implementation;
    occupyCallers++;
    try {
      callback(complete);
    } catch (err) {
      complete();
      throw err;
    }
  }
}

export class ProvideDecoratorPayload<T = unknown, R = T> {
  private readonly _type?: MaybeOptional<ServiceType<T>>;

  /**
   * Whether `undefined`, inherits type from `Reflect.getMetadata('design:paramtypes')`
   */
  get type(): MaybeOptional<ServiceType<T>> | undefined {
    return this._type;
  }

  private readonly _transform?: MapCallback<T, R>;

  /**
   * Function applied to get a new value out of provided one.
   */
  get transform(): MapCallback<T, R> | undefined {
    return this._transform;
  }

  private readonly _optional?: boolean;

  /**
   * Determines whether dependency is optional.
   */
  get optional(): boolean | undefined {
    return this._optional;
  }

  constructor(type?: MaybeOptional<ServiceType<T>>, transform?: MapCallback<T, R>, optional?: boolean) {
    this._type = type;
    this._transform = transform;
    this._optional = optional;
  }
}

export type ProvideDecorator<T = unknown, R = unknown> = ParameterDecoratorWithPayload<ProvideDecoratorPayload<T, R>>;

export function Provide(): ProvideDecorator;
export function Provide(optional: OptionalModifier): ProvideDecorator;
export function Provide<T>(type: MaybeOptional<ServiceType<T>>): ProvideDecorator<T>;
export function Provide<T>(optional: OptionalModifier, type: ServiceType<T>): ProvideDecorator<T>;
export function Provide<T, R>(type: OptionalMarker<ServiceType<T>>, transform: (value?: T) => MaybePromiseLike<R>): ProvideDecorator<T, R>;
export function Provide<T, R>(type: ServiceType<T>, transform: MapCallback<T, MaybePromiseLike<R>>): ProvideDecorator<T, R>;
export function Provide<T, R>(optional: OptionalModifier, type: ServiceType<T>, transform: (value?: T) => MaybePromiseLike<R>): ProvideDecorator<T, R>;
export function Provide(...args: unknown[]): unknown {
  let type: MaybeOptional<ServiceType> | undefined, transform: MapCallback<unknown> | undefined,
    optional: boolean | undefined;

  if (1 === args.length) {
    if (OptionalModifier.instance === args[0]) { // optional: OptionalModifier
      optional = true;
    } else { // type: ServiceType<T>
      type = args[0] as MaybeOptional<ServiceType>;
      if (args[0] instanceof OptionalMarker) {
        optional = true;
      }
    }
  } else if (2 === args.length) {
    if (OptionalModifier.instance === args[0]) { // optional: OptionalModifier, type: ServiceType<T>
      optional = true;
      type = args[1] as ServiceType;
    } else { // type: ServiceType<T>, transform: MapCallback<T, MaybePromiseLike<R>>
      type = args[0] as MaybeOptional<ServiceType>;
      transform = args[1] as MapCallback<unknown>;
      if (args[0] instanceof OptionalMarker) {
        type = args[0].value;
        optional = true;
      }
    }
  } else if (3 === args.length) { // optional: OptionalModifier, type: ServiceType<T>, transform: MapCallback<T, MaybePromiseLike<R>>
    optional = true;
    type = args[1] as ServiceType;
    transform = args[2] as MapCallback<unknown>;
  }

  const payload = new ProvideDecoratorPayload(type, transform, optional);
  return makeParameterDecorator(Provide, payload);
}

export namespace Provide {
  export class ParameterDescriptor extends ProvideDecoratorPayload {
    override get type(): MaybeOptional<ServiceType> {
      return super.type!;
    }

    override get transform(): MapCallback<unknown, unknown> {
      return super.transform!;
    }

    private readonly _index: number;

    /**
     * Position of parameter in a particular constructor or method.
     */
    get index(): number {
      return this._index;
    }

    constructor(type: MaybeOptional<ServiceType>, transform: MapCallback<unknown, unknown>, index: number, optional?: boolean) {
      super(type, transform, optional);
      this._index = index;
    }
  }

  export class TargetDescriptor extends FunctionClass<(args: unknown[], done: ValueCallback<unknown[]>) => void> {
    private readonly _type: Type;

    get type(): Type {
      return this._type;
    }

    private readonly _propertyKey?: string | symbol;

    /**
     * Whether this is `undefined`, target is a class constructor.
     */
    get propertyKey(): string | symbol | undefined {
      return this._propertyKey;
    }

    private readonly _skipCount?: number;

    /**
     * Whether object method or class constructor has reserved arguments.
     */
    get skipCount(): number | undefined {
      return this._skipCount;
    }

    private readonly _reflectMetadata: readonly Type[] | undefined;

    /**
     * Result of `Reflect.getMetadata('design:paramtypes', ...);`
     */
    get reflectMetadata(): readonly Type[] | undefined {
      return this._reflectMetadata;
    }

    private readonly _parameters: readonly ParameterDescriptor[];

    get parameters(): readonly ParameterDescriptor[] {
      return this._parameters;
    }

    private readonly _dependencies: readonly MaybeOptional<ServiceType>[];

    /**
     * Compatible dependencies list for {@link ServiceDesciptor}.
     */
    get dependencies(): readonly MaybeOptional<ServiceType>[] {
      return this._dependencies;
    }

    constructor(
      type: Type,
      propertyKey?: string | symbol | undefined,
      skipCount?: number | undefined,
      reflectMetadata?: readonly Type[],
      parameters: readonly ParameterDescriptor[] = [],
    ) {
      const dependencies = parameters.map(parameter => parameter.type);
      const length = parameters.reduce((max, item) => Math.max(item.index, max), -1) + 1;
      super((args, done) => { // perform argument transform and trust argument count
        if (args.length < length) { // add handler for optional services
          throw new Error('Expected more arguments');
        }
        MaybePromiseLike.all(() => {
          return parameters.map(parameter => parameter.transform(args[parameter.index]));
        }, done);
      });
      this._type = type;
      this._propertyKey = propertyKey;
      this._skipCount = skipCount;
      this._reflectMetadata = reflectMetadata;
      this._parameters = parameters;
      this._dependencies = dependencies;
    }
  }

  export function targetAssemble(target: Type, skipCount?: number): TargetDescriptor;
  export function targetAssemble(target: Type, propertyKey: string | symbol, skipCount?: number): TargetDescriptor;
  export function targetAssemble(...args: unknown[]) {
    const type = args[0] as Type;
    let propertyKey: string | symbol | undefined, skipCount: number | undefined;

    if (2 === args.length) {
      if (typeof args[1] === 'number') { // target: Type, skipCount: number
        skipCount = args[1];
      } else { // target: Type, propertyKey: string | symbol
        propertyKey = args[1] as string | symbol;
      }
    } else if (3 === args.length) { // target: Type, propertyKey: string | symbol, skipCount: number
      propertyKey = args[1] as string | symbol;
      skipCount = args[2] as number;
    }

    const length = propertyKey ? type.prototype[propertyKey].length : type.length;
    const reflectMetadata = undefined === skipCount || skipCount < length ?
      reflectTargetTypes(type, propertyKey) : undefined;
    let parameters: ParameterDescriptor[] = [];

    if (reflectMetadata) {
      const recordedDecoration = DecoratorRecorder.parameterSearch(Provide, type, propertyKey);
      parameters = reflectMetadata.map<[index: number, Type]>((type2, index) => [index, type2])
        .slice(skipCount || 0)
        .map<ParameterDescriptor>(([index, type2]) => {
          const filtered = recordedDecoration.filter(record => record.path[2] === index);
          let type3: MaybeOptional<ServiceType>, transform: MapCallback<unknown> | undefined,
            optional: boolean | undefined;

          if (filtered.length) {
            const payload = filtered[0].payload;
            type3 = payload.type || type2;
            transform = payload.transform || (x => x);
            optional = payload.optional;
            if (optional) {
              type3 = new OptionalMarker(type3) as OptionalMarker<ServiceType>;
            }
          } else {
            type3 = type2;
            transform = x => x; // todo: use known function proxyValue(val) => val;
          }

          return new ParameterDescriptor(type3, transform, index, optional);
        });
    }

    return new TargetDescriptor(type, propertyKey, skipCount, reflectMetadata, parameters);
  }
}
