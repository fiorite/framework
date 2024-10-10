import { HttpCallback, HttpPipeline } from '../http';
import { ApplicationConfigureFunction } from './application';

export function featureMiddleware(callback: HttpCallback): ApplicationConfigureFunction {
  return provider => provider(HttpPipeline).add(callback);
}
