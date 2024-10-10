import { ApplicationFeature } from './feature';
import { BehaveLike, runProviderContext, ServiceProvider, ServiceProviderWithReturnFunction, ServiceSet } from '../di';
import { HttpServer } from '../http';
import { Route, RouteMatcher } from '../routing';
import { Logger } from '../logging';
import { MaybeArray, MaybePromiseLike, promiseWhenNoCallback, VoidCallback } from '../core';
import { addHttpServer, HttpServerFeature } from './http-server';
import { dbCoreServices } from '../db';

// todo: make reactive application which extends as it goes.
export class Application {
  private readonly _provider: ServiceProvider;

  get provider(): ServiceProvider {
    return this._provider;
  }

  get provide(): ServiceProviderWithReturnFunction {
    return this._provider.withReturn;
  }

  get server(): HttpServer {
    return this._provider(HttpServer);
  }

  get routing(): RouteMatcher {
    return this._provider(RouteMatcher);
  }

  get logger(): Logger {
    return this._provider(Logger);
  }

  constructor(provider: ServiceProvider) {
    this._provider = provider;
  }

  call(callback: (complete: VoidCallback) => void): void {
    runProviderContext(this._provider, callback);
  }

  run(callback: VoidCallback): void;
  run(): PromiseLike<void>;
  run(callback?: VoidCallback): unknown {
    return promiseWhenNoCallback<void>(callback => {
      runProviderContext(this._provider, complete => {
        this._provider(HttpServer).listen(
          this._provider(HttpServerFeature).port,
          () => MaybePromiseLike.then(() => callback(), complete),
        );
      });
    }, callback);
  }
}

export function makeApplication(...features: ApplicationFeature[]): Application {
  features = features.filter(x => !(x instanceof HttpServerFeature));

  const provider = new ServiceProvider();
  addHttpServer().configure(provider);
  dbCoreServices.configure!(provider);

  // resolve tree of extendWith
  // const queue = [...features];
  // while (queue.length) {
  //   const feature = queue.shift()!;
  //   if (feature.extendWith) {
  //     queue.unshift(...MaybeArray.toArray(feature.extendWith));
  //   }
  //   if (!features.includes(feature)) {
  //     features.unshift(feature);
  //   }
  // }

  // const serviceSet = new ServiceSet();
  //
  // serviceSet.addDecoratedBy(BehaveLike);

  runProviderContext(provider, complete => {
    features.filter(x => x.configure).forEach(x => x.configure!(provider));
    provider.addDecoratedBy(BehaveLike);
    provider.addMissingDependencies();
    provider._performStabilityChecks();
    const touchSingletons = true;

    let completed = false;
    let configured = false;

    if (touchSingletons) {
      provider.preCacheSingletons(() => {
        completed = true;
        if (configured) {
          complete();
        }
      });
    }

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
