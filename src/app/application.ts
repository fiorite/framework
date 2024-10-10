import {
  BehaveLike,
  runProviderContext,
  ServiceProvider,
  ServiceProvideFunction,
  ServiceProvideAsyncFunction, ServiceType
} from '../di';
import { HttpServer } from '../http';
import { Route, RouteMatcher } from '../routing';
import { Logger, LogLevel } from '../logging';
import { MaybePromiseLike, promiseWhenNoCallback, VoidCallback } from '../core';
import { featureHttpServer, httpServerPort } from './http-server';
import { dbCoreServices } from '../db';
import { featureConsoleLogger } from './logging';

// todo: make reactive application which extends as it goes.
export class Application {
  private readonly _provider: ServiceProvider;

  get provider(): ServiceProvider {
    return this._provider;
  }

  get add(): typeof this.provider.add {
    return this._provider.add.bind(this._provider);
  }

  get get(): ServiceProvideFunction {
    return this._provider.get.bind(this._provider);
  }

  get async(): ServiceProvideAsyncFunction {
    return this._provider.async.bind(this._provider);
  }

  get has(): (type: ServiceType) => boolean {
    return this._provider.has.bind(this._provider);
  }

  get httpServer(): HttpServer {
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
          this._provider(httpServerPort),
          () => MaybePromiseLike.then(() => callback(), complete),
        );
      });
    }, callback);
  }
}

export type ApplicationConfigureFunction = (provider: ServiceProvider) => void;

export function makeApplication(...features: ApplicationConfigureFunction[]): Application {
  const provider = new ServiceProvider();
  const development = !(import.meta as any).env?.PROD && process.env['NODE_ENV'] === 'development';
  provider.addValue(Symbol.for('development'), development);
  featureConsoleLogger(development ? LogLevel.Debug : undefined)(provider); // todo: make configurable

  featureHttpServer()(provider);
  dbCoreServices(provider);

  runProviderContext(provider, complete => {
    features.forEach(featureFunction => featureFunction(provider));
    provider.addDecoratedBy(BehaveLike);
    provider.addMissingDependencies();
    provider._performStabilityCheck();
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
