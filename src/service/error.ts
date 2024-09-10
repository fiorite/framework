import { ServiceKey } from './key';

export class ServiceNotFound implements Error {
  readonly name = 'ServiceNotFound';
  readonly message = 'Service is not found';

  constructor(key: ServiceKey) {
  }
}
