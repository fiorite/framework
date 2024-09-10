import { MaybePromise, ValueCallback } from '../core';
import { ServiceKey } from './key';

export type ServiceProvideFunction = <T>(key: ServiceKey<T>, callback: ValueCallback<T>) => void;

export type ServiceFactoryFunction<T = unknown> = (provide: ServiceProvideFunction, callback: ValueCallback<T>) => void;

export type ServiceLinearFactoryFunction<T> = (...args: any[]) => MaybePromise<T>;

export namespace ServiceFactoryFunction {
  // todo: consider a better name
  export function combine(keys: readonly ServiceKey[]): ServiceFactoryFunction<unknown[]> {
    return (provide: ServiceProvideFunction, callback: ValueCallback<unknown[]>) => {
      if (!keys.length) {
        return callback([]);
      }

      const args = new Array(keys.length);
      let resolved = 0;
      keys.forEach((key, index) => {
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
