import { ServiceProvider, ServiceSet } from '../di';
import { doNothing } from '../core';

export type ApplicationRegisterServicesFunction = (serviceSet: ServiceSet) => void;

export type ApplicationConfigureFunction = (provider: ServiceProvider) => void;

export interface ApplicationFeature {
  registerServices?: ApplicationRegisterServicesFunction;
  configure?: ApplicationConfigureFunction;
}

export function applicationFeature(
  registerServices: ApplicationRegisterServicesFunction,
  configure: ApplicationConfigureFunction,
): ApplicationFeature {
  return { configure, registerServices: registerServices };
}

export namespace applicationFeature {
  /** @deprecated use {@link registerServices} */
  export function servicesOnly(configure: ApplicationRegisterServicesFunction): ApplicationFeature {
    return applicationFeature(configure, doNothing);
  }
}

export function registerServices(configure: ApplicationRegisterServicesFunction): ApplicationFeature {
  return applicationFeature(configure, doNothing);
}
