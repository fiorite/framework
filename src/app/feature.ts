import { ServiceProvider, ServiceSet } from '../di';

export interface ApplicationFeature {
  configureServices?(serviceSet: ServiceSet): void;
  configure?(provide: ServiceProvider): void;
}
