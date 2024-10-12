import { ApplicationConfigureFunction } from '../app';
import { EventEmitter } from './emitter';

export function addEventEmitter(): ApplicationConfigureFunction {
  return provider => provider.add(EventEmitter);
}
