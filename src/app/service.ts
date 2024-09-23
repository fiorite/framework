import { ApplicationFeature } from './feature';
import { ServiceDescriptor, ServiceSet } from '../di';
import { Type } from '../core';

export class AddServicesFeature implements ApplicationFeature {
  constructor(readonly values: Iterable<Type | ServiceDescriptor | object>) {
  }

  configureServices(serviceSet: ServiceSet) {
    serviceSet.addAll(this.values);
  }
}

export function addService(...values: readonly (Type | ServiceDescriptor | object)[]): AddServicesFeature {
  return new AddServicesFeature(values);
}
