import {
  DecoratorRecorder,
  makeParameterDecorator,
  MapCallback,
  MaybePromiseLike,
  ParameterDecoratorWithPayload,
  reflectTargetTypes,
  Type
} from '../core';
import { ServiceReference } from './service-ref';
import { ServiceType } from './service-type';
import { ServiceFactory, ServiceFactoryCallback } from './service-factory';

export type ProvideDecorator<T, R = any> = ParameterDecoratorWithPayload<ServiceReference<T, R>>;

export function Provide<T>(type: ServiceType<T>): ProvideDecorator<T>;
export function Provide<T, R>(type: ServiceType<T>, callback: MapCallback<T, MaybePromiseLike<R>>): ProvideDecorator<T, R>;
export function Provide(...args: unknown[]): unknown {
  const ref = new ServiceReference(args[0] as ServiceType, args[1] as MapCallback<unknown, unknown>);
  return makeParameterDecorator(Provide, ref);
}

export namespace Provide {
  export function factoryCut(target: Type | [Type, propertyKey: string | symbol], options: {
    readonly from?: number;
    readonly to?: number;
  } = {}): ServiceFactory<unknown[]> {
    let type: Type, propertyKey: string | symbol | undefined;

    if (Array.isArray(target)) {
      type = target[0];
      propertyKey = target[1];
    } else {
      type = target;
    }

    const length = propertyKey ? type.prototype[propertyKey].length : type.length;
    const from = options.from || 0;
    const to = options.to && options.to > -1 ? options.to : length;

    const records = DecoratorRecorder.parameterSearch(Provide, type, propertyKey);

    const influenced = reflectTargetTypes(type, propertyKey).map<[index: number, Type]>((type, index) => [index, type])
      .filter(([index]) => index >= from && index <= to)
      .map<{ type: ServiceType, project: Function }>(([index, type]) => {
        const filtered = records.filter(record => record.path[2] === index);
        return filtered.length ? { type: filtered[0].payload.type, project: filtered[0].payload.project, } :
          { type, project: (value: unknown) => value };
      });

    const dependencies = influenced.map(object => object.type);

    return new ServiceFactory((provide, result) => {
      ServiceFactoryCallback.all(dependencies)(provide, raw => {
        MaybePromiseLike.all(() => raw.map((value, index) => influenced[index].project(value)), result);
        //result => {
        // args2.forEach((arg, index) => {
        //   if (!(arg instanceof parameters[index].original) && (arg as any).constructor !== parameters[index].original) {
        //     console.warn(`Possibly type issue. ${type.name}#constructor([${index}]: ${parameters[index].original.name}). Actual: ${(arg as any).constructor.name}`);
        //   }
        // });
        // complete(result);
        // });
      });
    }, dependencies);
  }
}
