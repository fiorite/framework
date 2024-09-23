import { ApplicationFeature } from './feature';
import {
  InstantServiceProvideFunction,
  makeServiceProvider,
  runProviderContext,
  ServiceBehavior,
  ServiceProvider,
  ServiceSet
} from '../di';
import { HttpServer } from '../http';
import { RouteMatcher } from '../router';
import { Logger } from '../logger';
import { MaybePromise, ValueCallback, VoidCallback } from '../core';
import { Closeable } from '../io';
import { addHttpServer, HttpServerFeature } from './http-server';

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

  withProviderContext(callback: (complete: VoidCallback) => void): void {
    runProviderContext(this._provider, callback);
  }

  listen(port: number, callback: ValueCallback<unknown>): Closeable {
    let closeable: Closeable;
    runProviderContext(this._provider, complete => {
      closeable = this._provider(HttpServer).listen(port, value => {
        MaybePromise.then(() => callback(value), complete);
      });
    });
    return closeable!;
  }
}

export function makeApplication(...features: ApplicationFeature[]): Application {
  const serviceSet = new ServiceSet();

  if (!features.some(x => x instanceof HttpServerFeature)) {  // should be by default.
    features.unshift(addHttpServer());
  }

  features.filter(x => x.configureServices).forEach(x => x.configureServices!(serviceSet));

  const provider = makeServiceProvider(serviceSet, true);
  const preCacheSingleton = true;

  runProviderContext(provider, complete => {
    let preCached = false;
    let configured = false;

    if (preCacheSingleton) {
      Array.from(provider)
        .filter(x => ServiceBehavior.Singleton === x.behavior)
        .forEach(x => {
          provider.provide(x.type, () => {
            preCached = true;
            if (configured) {
              complete();
            }
          });
        });
    }

    features.filter(x => x.configure).forEach(x => x.configure!(provider));
    configured = true;
    if (preCached) {
      complete();
    }
  });

  return new Application(provider);
}
