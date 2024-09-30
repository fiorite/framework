import { ServiceProvider, ServiceSet } from '../di';
import { doNothing } from '../core';

export type ApplicationConfigureServicesFunction = (serviceSet: ServiceSet) => void;

export type ApplicationConfigureFunction = (provider: ServiceProvider) => void;

export interface ApplicationFeature {
  configureServices?: ApplicationConfigureServicesFunction;
  configure?: ApplicationConfigureFunction;
}

export function applicationFeature(
  configureServices: ApplicationConfigureServicesFunction,
  configure: ApplicationConfigureFunction,
): ApplicationFeature {
  return { configure, configureServices };
}

export namespace applicationFeature {
  /** @deprecated use {@link configureServices} */
  export function servicesOnly(configure: ApplicationConfigureServicesFunction): ApplicationFeature {
    return applicationFeature(configure, doNothing);
  }
}

export function configureServices(configure: ApplicationConfigureServicesFunction): ApplicationFeature {
  return applicationFeature(configure, doNothing);
}
