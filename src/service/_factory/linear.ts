import { FunctionClass, MaybePromise } from '../../core';
import { ServiceFactoryFunction, ServiceLinearFactoryFunction } from '../function-type';
import { ServiceKey } from '../key';

export class ServiceLinearFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _serviceFactory: ServiceLinearFactoryFunction<T>;

  get serviceFactory(): ServiceLinearFactoryFunction<T> {
    return this._serviceFactory;
  }

  private readonly _dependencies: readonly ServiceKey[] = [];

  get dependencies(): readonly ServiceKey[] {
    return this._dependencies;
  }

  constructor(serviceFactory: ServiceLinearFactoryFunction<T>, dependencies: readonly ServiceKey[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.combine(dependencies || [])(provide, args => {
        MaybePromise.then(() => serviceFactory(...args), callback);
      });
    });
    this._serviceFactory = serviceFactory;
    this._dependencies = dependencies;
  }
}
