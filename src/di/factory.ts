import { FunctionClass, MaybePromise } from '../core';
import { ServiceFactoryFunction, ServiceFactoryReturnFunction } from './function';
import { ServiceCallbackQueue } from './_queue';
import { ServiceType } from './type';

export class ServiceValueFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _value: T;

  get value(): T {
    return this._value;
  }

  constructor(value: T) {
    super((_, callback) => callback(value));
    this._value = value;
  }
}

const callbackQueue = new ServiceCallbackQueue();

export class ServiceSingletonFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  constructor(factory: ServiceFactoryFunction<T>) {
    super((provide, callback) => {
      if (!!this._value) {
        return callback(this._value);
      }

      callbackQueue.add([this, 'singletonFactory'], callback2 => {
        factory(provide, value => {
          this._value = value;
          callback2(value);
        });
      }, callback);
    });
  }
}

export class ServiceFactoryReturn<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _factory: ServiceFactoryReturnFunction<T>;

  get factory(): ServiceFactoryReturnFunction<T> {
    return this._factory;
  }

  private readonly _dependencies: readonly ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  constructor(factory: ServiceFactoryReturnFunction<T>, dependencies: readonly ServiceType[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.from(dependencies)(provide, args => {
        MaybePromise.then(() => factory(...args), callback);
      });
    });
    this._factory = factory;
    this._dependencies = dependencies;
  }
}
