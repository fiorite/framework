import { ServiceProvider } from './provider';
import { MaybePromiseLike, VoidCallback } from '../core';

export interface ServiceConfigureFunction {
  (provider: ServiceProvider): MaybePromiseLike<unknown>;

  (provider: ServiceProvider, done: VoidCallback): unknown;
}

const _lateServiceConfigurations = new Set<ServiceConfigureFunction>();

export const lateServiceConfigurations: ReadonlySet<ServiceConfigureFunction> = _lateServiceConfigurations;

export function configureServices(callback: ServiceConfigureFunction): void {
  _lateServiceConfigurations.add(callback);
}

