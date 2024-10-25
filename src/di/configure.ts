import { ServiceProvider } from './provider';
import { MaybePromiseLike, VoidCallback } from '../core';

// todo: add #done()
export type ServiceConfigureFunction = (provider: ServiceProvider/*, done?: VoidCallback*/) => MaybePromiseLike<unknown>;

const _globalConfiguration = new Set<ServiceConfigureFunction>();

export const globalConfiguration: ReadonlySet<ServiceConfigureFunction> = _globalConfiguration;

export function configureProvider(callback: ServiceConfigureFunction): void {
  _globalConfiguration.add(callback);
}

