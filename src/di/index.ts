export {
  BehaveLike,
  Singleton,
  Inherited,
  Scoped,
  Prototype,
  BehaveLikePayload,
  BehaveLikeDecorator,
  ProvidePayload,
  Provide,
  ProvideDecorator
} from './decorators';
export { ServiceBehavior } from './service-behavior';
export { ServiceDescriptor } from './service-descriptor';
export { ServiceSet } from './service-set';
export {
  ServiceFactoryFunction,
  ServiceFactory,
  ServiceFactoryWithReturn,
  ServiceFactoryWithReturnFunction,
  ValueFactory,
  TypeFactory,
  TargetParametersFactory,
  ObjectMethodFactory,
} from './service-factory';
export {
  ServiceProvider,
  ServiceNotFoundError,
  ServiceProvideFunction,
  ServiceProviderWithReturn,
  ServiceProviderWithReturnFunction,
} from './service-provider';
export { ServiceType } from './service-type';
export { ServiceScope, OnScopeDestroy } from './service-scope';

export { runProviderContext, provide } from './global'; // will be moved away
