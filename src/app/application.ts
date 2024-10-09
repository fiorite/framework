import { ApplicationFeature } from './feature';
import { BehaveLike, runProviderContext, ServiceProvider, ServiceProviderWithReturnFunction, ServiceSet } from '../di';
import { HttpServer } from '../http';
import { Route, RouteMatcher } from '../routing';
import { Logger } from '../logging';
import { MaybeArray, MaybePromiseLike, promiseWhenNoCallback, VoidCallback } from '../core';
import { addHttpServer, HttpServerFeature } from './http-server';

export class Application {
  private readonly _services: ServiceProvider;

  get services(): ServiceProvider {
    return this._services;
  }

  get provide(): ServiceProviderWithReturnFunction {
    return this._services.withReturn;
  }

  get server(): HttpServer {
    return this._services(HttpServer);
  }

  get routing(): RouteMatcher {
    return this._services(RouteMatcher);
  }

  get logger(): Logger {
    return this._services(Logger);
  }

  constructor(provider: ServiceProvider) {
    this._services = provider;
  }

  contextualize(callback: (complete: VoidCallback) => void): void {
    runProviderContext(this._services, callback);
  }

  run(callback: VoidCallback): void;
  run(): PromiseLike<void>;
  run(callback?: VoidCallback): unknown {
    return promiseWhenNoCallback<void>(callback => {
      runProviderContext(this._services, complete => {
        this._services(HttpServer).listen(
          this._services(HttpServerFeature).port,
          () => MaybePromiseLike.then(() => callback(), complete),
        );
      });
    }, callback);
  }
}

export function makeApplication(...features: ApplicationFeature[]): Application {
  const serviceSet = new ServiceSet();

  serviceSet.addDecoratedBy(BehaveLike);

  if (!features.some(x => x instanceof HttpServerFeature)) {  // should be by default.
    features.unshift(addHttpServer());
  }

  // resolve tree of extendWith
  const queue = [...features];
  while (queue.length) {
    const feature = queue.shift()!;
    if (feature.extendWith) {
      queue.push(...MaybeArray.toArray(feature.extendWith));
    }
    if (!features.includes(feature)) {
      features.push(feature);
    }
  }

  features.filter(x => x.registerServices).forEach(x => x.registerServices!(serviceSet));
  serviceSet.includeDependencies();

  const provider = new ServiceProvider(serviceSet);
  const touchSingletons = true;

  runProviderContext(provider, complete => {
    let completed = false;
    let configured = false;

    if (touchSingletons) {
      provider.touchAllSingletons(() => {
        completed = true;
        if (configured) {
          complete();
        }
      });
    }

    features.filter(x => x.configure).forEach(x => x.configure!(provider));

    configured = true;
    if (completed) {
      complete();
    }

    if (provider.has(RouteMatcher)) { // todo: probably move somewhere else.
      provider(RouteMatcher).routeSet.addDecoratedBy(Route);
    }
  });

  return new Application(provider);
}
