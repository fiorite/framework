import { MaybePromise, ValueCallback } from '../core';
import { ServiceKey } from './key';

export type ServiceProvideFunction = <T>(key: ServiceKey<T>, callback: ValueCallback<T>) => void;

export type ServiceFactoryFunction<T = unknown> = (provide: ServiceProvideFunction, callback: ValueCallback<T>) => void;

export type ServiceLinearFactoryFunction<T> = (...args: any[]) => MaybePromise<T>;

export namespace ServiceFactoryFunction {
  export function from(array: readonly ServiceKey[]): ServiceFactoryFunction<unknown[]> {
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
          if (resolved === args.length) {
            callback(args);
          }
        });
      });
    };
  }
}
