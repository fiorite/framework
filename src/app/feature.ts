import { ServiceProvider, ServiceSet } from '../di';
import { emptyCallback, MaybeArray } from '../core';

export type ApplicationRegisterServicesFunction = (serviceSet: ServiceSet) => void;

export type ApplicationConfigureFunction = (provider: ServiceProvider) => void;

export interface ApplicationFeature {
  extendWith?: MaybeArray<ApplicationFeature>;
  /**
   * @deprecated not used anymore.
   */
  registerServices?: ApplicationRegisterServicesFunction;
  configure?: ApplicationConfigureFunction;
}

/** @deprecated use literal perhaps */
export function applicationFeature(
  /**
   * @deprecated not used anymore.
   */
  registerServices: ApplicationRegisterServicesFunction,
  configure: ApplicationConfigureFunction,
): ApplicationFeature {
  return { configure, registerServices: registerServices };
}

export namespace applicationFeature {
  /** @deprecated use literal perhaps */
  export function servicesOnly(configure: ApplicationRegisterServicesFunction): ApplicationFeature {
    return applicationFeature(configure, emptyCallback);
  }
}

/** @deprecated use literal perhaps */
export function registerServices(configure: ApplicationRegisterServicesFunction): ApplicationFeature {
  return applicationFeature(configure, emptyCallback);
}
