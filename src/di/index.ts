export type {
  BehaveLikeDecorator,
} from './decorators';
export {
  BehaveLike,
  Singleton,
  Inherited,
  Scoped,
  Prototype,
} from './decorators';
export { ServiceBehavior } from './service-behavior';
export { configureProvider, globalConfiguration } from './service-configure';
export type { ServiceConfigureFunction } from './service-configure';
export { ServiceDescriptor } from './service-descriptor';
export { ServiceSet } from './service-set';
export type { ProvideDecorator } from './provide';
export { Provide } from './provide';
export type {
  ServiceFactoryCallback,
  ServiceFactoryFunction,
} from './service-factory';
export {
  ServiceFactory,
  ServiceFactoryWithReturn,
  ValueFactory,
  TypeFactory,
  TargetParametersFactory,
  ObjectMethodFactory,
} from './service-factory';
export type {
  ServiceProvideCallback,
  ServiceProvideFunction,
  OnScopeDestroy,
  ServiceProvideAsyncFunction,
} from './service-provider';
export {
  ServiceProvider,
  ServiceNotFoundError,
} from './service-provider';
export type { ServiceType } from './service-type';
export { serviceRef, ServiceReference } from './service-ref';
export { ServiceScope } from './service-scope';

export { runProviderContext, provide } from './global'; // todo: will be moved away
