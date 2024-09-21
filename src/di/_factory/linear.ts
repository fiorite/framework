import { FunctionClass, MaybePromise } from '../../core';
import { ServiceFactoryFunction, ServiceLinearFactoryFunction } from '../function';
import { ServiceType } from '../service-type';

export class ServiceLinearFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _linearFactory: ServiceLinearFactoryFunction<T>;

  get linearFactory(): ServiceLinearFactoryFunction<T> {
    return this._linearFactory;
  }

  private readonly _dependencies: readonly ServiceType[] = [];

  get dependencies(): readonly ServiceType[] {
    return this._dependencies;
  }

  constructor(linearFactory: ServiceLinearFactoryFunction<T>, dependencies: readonly ServiceType[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.from(dependencies || [])(provide, args => {
        MaybePromise.then(() => linearFactory(...args), callback);
      });
    });
    this._linearFactory = linearFactory;
    this._dependencies = dependencies;
  }
}
