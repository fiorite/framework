import { ApplicationFeature } from './feature';
import { InstantServiceProvideFunction, makeServiceProvider, ServiceProvider, ServiceSet } from '../di';
import { addHttpServer, HttpServer } from '../http';
import { RouteMatcher } from '../router';
import { Logger } from '../logger';
import { ValueCallback } from '../core';
import { Closeable } from '../io';

export class Application {
  private readonly _provider: ServiceProvider;

  get provider(): ServiceProvider {
    return this._provider;
  }

  get provide(): InstantServiceProvideFunction {
    return this._provider.instant;
  }

  get server(): HttpServer {
    return this._provider(HttpServer);
  }

  get router(): RouteMatcher {
    return this._provider(RouteMatcher);
  }

  get logger(): Logger {
    return this._provider(Logger);
  }

  constructor(provider: ServiceProvider) {
    this._provider = provider;
  }

  listen(port: number, callback: ValueCallback<unknown>): Closeable {
    return this._provider(HttpServer).listen(port, callback);
  }
}

export function makeApplication(...features: ApplicationFeature[]): Application {
  const serviceSet = new ServiceSet();

  addHttpServer(serviceSet); // add by default.

  features.filter(x => x.configureServices).forEach(x => x.configureServices!(serviceSet));

  const provider = makeServiceProvider(serviceSet, true, true);
  features.filter(x => x.configure).forEach(x => x.configure!(provider));

  return new Application(provider);
}
