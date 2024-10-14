import { HttpCallback } from './callback';
import { HttpPipeline } from './pipeline';
import { ServiceConfigureFunction } from '../di';

export function addMiddleware(callback: HttpCallback): ServiceConfigureFunction {
  return provide => provide(HttpPipeline).add(callback);
}
