import { FunctionClass } from '../../core';
import { ServiceFactoryFunction } from '../function-type';
import { ServiceCallbackQueue } from '../_queue';

const callbackQueue = new ServiceCallbackQueue();

export class ServiceSingletonFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private _serviceInstance?: T;

  get serviceInstance(): T | undefined {
    return this._serviceInstance;
  }

  constructor(serviceFactory: ServiceFactoryFunction<T>) {
    super((provide, callback) => {
      if (!!this._serviceInstance) {
        return callback(this._serviceInstance);
      }

      callbackQueue.add([this, 'singletonFactory'], callback2 => {
        serviceFactory(provide, value => {
          this._serviceInstance = value;
          callback2(value);
        });
      }, callback);
    });
  }
}
