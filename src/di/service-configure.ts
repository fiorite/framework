import { ServiceProvider } from './service-provider';
import { MaybePromiseLike } from '../core';
import { privateDecrypt } from 'node:crypto';

export type ServiceConfigureFunction = (provider: ServiceProvider) => MaybePromiseLike<unknown>;

const _globalConfiguration = new Set<ServiceConfigureFunction>();

export const globalConfiguration: ReadonlySet<ServiceConfigureFunction> = _globalConfiguration;

export function configureProvider(callback: ServiceConfigureFunction): void {
  _globalConfiguration.add(callback);
}
