import { MaybeOptional, MaybePromiseLike, ValueCallback } from '../core';
import { ServiceType } from './type';
import type { ServiceProvideCallback } from './provider';

export type ServiceFactoryCallback<T = unknown> = (provide: ServiceProvideCallback, callback: ValueCallback<T>) => void;

export type ServiceFactoryFunction<R, P extends unknown[] = any[]> = (...args: P) => MaybePromiseLike<R>;

export namespace ServiceFactoryCallback {
  export function all(array: readonly MaybeOptional<ServiceType>[]): ServiceFactoryCallback<unknown[]> {
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

