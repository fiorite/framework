import { FunctionClass, MaybePromise } from '../../core';
import { ServiceFactoryFunction, ServiceLinearFactoryFunction } from '../function-type';
import { ServiceKey } from '../key';

export class ServiceLinearFactory<T> extends FunctionClass<ServiceFactoryFunction<T>> {
  private readonly _linearFactory: ServiceLinearFactoryFunction<T>;

  get linearFactory(): ServiceLinearFactoryFunction<T> {
    return this._linearFactory;
  }

  private readonly _dependencies: readonly ServiceKey[] = [];

  get dependencies(): readonly ServiceKey[] {
    return this._dependencies;
  }

  constructor(linearFactory: ServiceLinearFactoryFunction<T>, dependencies: readonly ServiceKey[] = []) {
    super((provide, callback) => {
      ServiceFactoryFunction.from(dependencies || [])(provide, args => {
        MaybePromise.then(() => linearFactory(...args), callback);
      });
    });
    this._linearFactory = linearFactory;
    this._dependencies = dependencies;
  }
}
