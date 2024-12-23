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
export { ServiceDescriptor } from './descriptor';
export { ServiceBehavior } from './behavior';
export { configureServices } from './configure';
export type { ServiceConfigureFunction } from './configure';
export type { ProvideDecorator } from './provide';
export { Provide, occupyProvide, provide, provideAsync, ProvidePayload, ProvideTarget, ProvideTargetParameter } from './provide';
export type {
  ServiceFactoryCallback,
  ServiceFactoryFunction,
} from './factory';
export type {
  ServiceProvideCallback,
  ServiceProvideFunction,
  OnScopeDestroy,
  ServiceProvideAsyncFunction,
} from './provider';
export {
  ServiceProvider,
  ServiceNotFoundError,
} from './provider';
export type { ServiceType } from './type';
export { serviceRef, ServiceReference } from './service-ref';

