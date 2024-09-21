import { ServiceType } from './service-type';
import { MaybeSyncProvideFunction, ServiceProvideFunction } from './function';
import { FunctionClass, ValueCallback } from '../core';

export interface MaybeSyncServiceProvider extends MaybeSyncProvideFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */
    <T>(type: ServiceType<T>): T;

  /**
   * Fallback to {@link ServiceProvideFunction}
   */
    <T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class MaybeSyncServiceProvider extends FunctionClass<MaybeSyncProvideFunction> {
  /**
   * Inner implementation if {@link ServiceProvideFunction}
   * @private
   */
  private readonly _provide: ServiceProvideFunction;

  /**
   * Getter of readonly {@link _provide}.
   */
  get provide(): ServiceProvideFunction {
    return this._provide;
  }

  constructor(provide: ServiceProvideFunction) {
    super(<T>(key: ServiceType<T>, callback?: ValueCallback<T>): unknown => {
      if (callback) {
        return provide(key, callback);
      }

      let done = false;
      let value: T | undefined = undefined;
      provide(key, (value2) => {
        done = true;
        value = value2;
      });
      if (done) {
        return value as T;
      }
      throw new Error(`Service(${ServiceType.toString(key)}) is not synchronous. Add callback() to provide(..., callback) instead.`);
    });
    this._provide = provide;
  }
}
