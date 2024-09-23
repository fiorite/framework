import { InstantServiceProvideFunction, ServiceSet } from '../di';

export interface ApplicationFeature {
  configureServices?(serviceSet: ServiceSet): void;
  configure?(provide: InstantServiceProvideFunction): void;
}
