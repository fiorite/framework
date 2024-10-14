import { ApplicationConfigureFunction } from '../app';
import { EventEmitter } from './emitter';
import { DecoratorRecorder } from '../core';
import { OnEvent } from './on';
import { Provide, ServiceFactoryCallback } from '../di';

export function addEventEmitter(): ApplicationConfigureFunction {
  return provider => {
    const emitter = new EventEmitter();
    provider.addValue(EventEmitter, emitter);
    DecoratorRecorder.methodSearch(OnEvent).forEach(record => {
      const method = record.path[0].prototype[record.path[1]] as Function;
      const length = method.length;
      const params: ServiceFactoryCallback<unknown[]> = length > 1 ?
        Provide.factoryCut([record.path[0], record.path[1]], { from: 1 }) :
        (_, result) => result([]);

      emitter.on(record.payload as string | symbol | number, event => { // todo: add analyzer component and point out that events cannot be handled in Scoped behavior.
        provider.prototypeWhenMissing(record.path[0], instance => {
          params(provider, args => instance[record.path[1]](event, ...args));
        });
      });
    });
  };
}
