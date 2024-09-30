import { ServiceProvider, ServiceSet } from '../di';

export type ApplicationConfigureServicesFunction = (serviceSet: ServiceSet) => void;

export type ApplicationConfigureFunction = (provider: ServiceProvider) => void;

export interface ApplicationFeature {
  configureServices?: ApplicationConfigureServicesFunction;
  configure?: ApplicationConfigureFunction;
}

/** @internal solves late configurations to ignore feature order. */
/** @deprecated change router to bind routes on the flight and remove this one. */
export class LateConfiguration extends Set<ApplicationConfigureFunction> {
}

export function applicationFeature(
  configureServices: ApplicationConfigureServicesFunction,
  configure: ApplicationConfigureFunction,
): ApplicationFeature {
  return { configure, configureServices };
}
