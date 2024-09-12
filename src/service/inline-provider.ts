import { ServiceKey } from './key';
import { ServiceProvideFunction } from './function-type';
import { FunctionClass, ValueCallback } from '../core';

export interface InlineServiceProvideFunction extends ServiceProvideFunction {
  /**
   * @throws Error if service is asynchronous (promise like)
   */
  <T>(serviceKey: ServiceKey<T>): T;

  /**
   * Error-safe method.
   */
  promise<T>(serviceKey: ServiceKey<T>): PromiseLike<T>;
}

export interface InlineServiceProvider extends InlineServiceProvideFunction { }

export class InlineServiceProvider extends FunctionClass<InlineServiceProvideFunction> implements InlineServiceProvideFunction {
  private readonly _provide: ServiceProvideFunction;

  constructor(provide: ServiceProvideFunction) {
    super(<T>(key: ServiceKey<T>, callback?: ValueCallback<T>): unknown => {
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
      throw new Error(`Service(${ServiceKey.toString(key)}) is not synchronous. Add callback() to provide(..., callback) instead.`);
    });
    this._provide = provide;
  }

  promise<T>(serviceKey: ServiceKey<T>): PromiseLike<T> {
    return new Promise((resolve, reject) => {
      try {
        return this._provide(serviceKey, resolve);
      } catch (err) {
        reject(err);
      }
    });
  }
}
