import { ApplicationFeature } from './feature';
import { InstantServiceProvideFunction } from '../di';
import { HttpCallback, HttpPipeline } from '../http';

export class MiddlewareFeature implements ApplicationFeature {
  private readonly _callback: HttpCallback;

  constructor(callback: HttpCallback) {
    this._callback = callback;
  }

  configure(provide: InstantServiceProvideFunction) {
    provide(HttpPipeline).add(this._callback);
  }
}

export function addMiddleware(callback: HttpCallback): MiddlewareFeature {
  return new MiddlewareFeature(callback);
}
