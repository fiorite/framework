import { ApplicationFeature } from './feature';
import { ServiceProvider, ServiceProviderWithReturnFunction } from '../di';
import { HttpCallback, HttpPipeline } from '../http';

export class MiddlewareFeature implements ApplicationFeature {
  private readonly _callback: HttpCallback;

  constructor(callback: HttpCallback) {
    this._callback = callback;
  }

  configure(provider: ServiceProvider) {
    provider(HttpPipeline).add(this._callback);
  }
}

export function addMiddleware(callback: HttpCallback): MiddlewareFeature {
  return new MiddlewareFeature(callback);
}
