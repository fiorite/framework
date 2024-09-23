import { ServiceType } from './type';
import { ServiceProvideFunction } from './function';
import { FunctionClass, ValueCallback } from '../core';

export interface InstantServiceProvideFunction extends ServiceProvideFunction {
  /**
   * @throws {@link Error} if service is asynchronous (promise like)
   */
    <T>(serviceType: ServiceType<T>): T;
}

export interface InstantServiceProvider extends InstantServiceProvideFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */
    <T>(serviceType: ServiceType<T>): T;

  /**
   * Fallback to {@link ServiceProvideFunction}
   */
    <T>(serviceType: ServiceType<T>, callback: ValueCallback<T>): void;
}

export class InstantServiceProvider extends FunctionClass<InstantServiceProvideFunction> {
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
    super(<T>(serviceType: ServiceType<T>, callback?: ValueCallback<T>): unknown => {
      if (callback) {
        return provide(serviceType, callback);
      }

      let done = false;
      let value: T | undefined = undefined;
      provide(serviceType, (value2) => {
        done = true;
        value = value2;
      });
      if (done) {
        return value as T;
      }
      throw new Error(`Service(${ServiceType.toString(serviceType)}) is not synchronous. Add callback() to provide(..., callback) instead.`);
    });
    this._provide = provide;
  }
}
