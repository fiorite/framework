import { EventEmitter } from './emitter';
import { DecoratorRecorder } from '../core';
import { OnEvent } from './on';
import { Provide, ServiceProvider } from '../di';

export function addEvents(provider: ServiceProvider): void {
  const emitter = new EventEmitter();
  provider.addValue(EventEmitter, emitter);
  DecoratorRecorder.methodSearch(OnEvent).forEach(record => {
    // const method = record.path[0].prototype[record.path[1]] as Function;
    // const length = method.length;
    const target = Provide.targetAssemble(record.path[0], record.path[1], 1);

    emitter.on(record.payload as string | symbol | number, event => { // todo: add analyzer component and point out that events cannot be handled in Scoped behavior.
      provider.prototypeWhenMissing(record.path[0], instance => {
        provider.all(target.dependencies, args => {
          target(args, args2 => instance[record.path[1]](event, ...args2));
        });
      });
    });
  });
}
