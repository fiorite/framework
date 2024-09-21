import { MaybePromise, ValueCallback } from '../core';
import { ServiceType } from './service-type';

export interface ServiceProvideFunction {
  <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export interface MaybeSyncProvideFunction extends ServiceProvideFunction {
  /**
   * @throws {@link Error} if service is asynchronous (promise like)
   */
  <T>(type: ServiceType<T>): T;
}

export type ServiceFactoryFunction<T = unknown> = (provide: ServiceProvideFunction, callback: ValueCallback<T>) => void;

export type ServiceLinearFactoryFunction<R, P extends unknown[] = any[]> = (...args: P) => MaybePromise<R>;

export namespace ServiceFactoryFunction {
  export function from(array: readonly ServiceType[]): ServiceFactoryFunction<unknown[]> {
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
