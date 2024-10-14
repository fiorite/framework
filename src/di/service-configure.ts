import { ServiceProvider } from './service-provider';
import { MaybePromiseLike } from '../core';

export type ServiceConfigureFunction = (provider: ServiceProvider) => MaybePromiseLike<unknown>;
