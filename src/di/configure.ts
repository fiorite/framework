import { ServiceProvider } from './provider';
import { MaybePromiseLike } from '../core';

export type ServiceConfigureFunction = (provider: ServiceProvider) => MaybePromiseLike<unknown>;

const _globalConfiguration = new Set<ServiceConfigureFunction>();

export const globalConfiguration: ReadonlySet<ServiceConfigureFunction> = _globalConfiguration;

export function configure(callback: ServiceConfigureFunction): void {
  _globalConfiguration.add(callback);
}

/** @deprecated use {@link configure} instead. */
export const configureProvider = configure;
