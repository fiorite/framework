import {
  globalConfiguration,
  ServiceConfigureFunction,
  ServiceProvideAsyncFunction,
  ServiceProvideFunction,
  ServiceProvider,
  ServiceType,
  occupyProvide
} from '../di';
// noinspection ES6PreferShortImport
import { BehaveLike } from '../di/decorators';
import { addCors, addHttpServer, addJsonParser, HttpServer, httpServerPort } from '../http';
import { addRouting, Route, RouteMatcher } from '../routing';
import { addConsoleLogger, Logger, LogLevel } from '../logging';
import {
  CallbackQueue,
  ComputedCallback,
  currentJsPlatform,
  MaybePromiseLike,
  promiseWhenNoCallback,
  VoidCallback
} from '../core';
import { addDbManager } from '../db';
import { addEvents } from '../events';

enum Environment {
  Production = 'production',
  Development = 'development',
}

const environmentKey = 'environment';

// todo: make reactive application which extends as it goes.
export class Application {
  private readonly _provider: ServiceProvider;
  private readonly _queue: CallbackQueue;
  private readonly _environment: Environment | string;

  get environment(): Environment | string {
    return this._environment;
  }

  get production(): boolean {
    return Environment.Production === this.environment;
  }

  get development(): boolean {
    return Environment.Development === this.environment;
  }

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
    return this._provider.getAsync.bind(this._provider);
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

  constructor(provider: ServiceProvider, queue: CallbackQueue) {
    this._provider = provider;
    this._queue = queue;
    this._environment = provider.get(environmentKey);
  }

  within(callback: (complete: VoidCallback) => void): void {
    occupyProvide(this._provider, callback);
  }

  ready(callback: VoidCallback): void {
    this._queue.on('empty', callback);
  }

  start(callback: VoidCallback): void;
  start(): PromiseLike<void>;
  start(callback?: VoidCallback): unknown {
    return promiseWhenNoCallback<void>(callback => {
      this._queue.on('empty', () => {
        occupyProvide(this._provider, complete => {
          this._provider(HttpServer).listen(
            this._provider(httpServerPort),
            () => MaybePromiseLike.then(() => callback(), complete),
          );
        });
      });
    }, callback);
  }
}

export function makeApplication(...features: ServiceConfigureFunction[]): Application {
  const provider = new ServiceProvider();
  const environment = process.env['NODE_ENV'] as Environment | string;
  provider.addValue('environment', environment);
  addConsoleLogger(provider, Environment.Production !== environment ? LogLevel.Debug : undefined); // todo: make configurable
  addDbManager(provider);
  addEvents(provider);

  // enqueue all the features:

  const queue = new CallbackQueue();

  const runnerLoader = ComputedCallback.preCache<void>(done => {
    // @ts-ignore
    const port = Number(currentJsPlatform === 'nodejs' ? (() => process.env['PORT'])() : 3000 || 3000);
    addHttpServer(provider, port, done);
  });

  addRouting(provider);
  addCors(provider);
  addJsonParser(provider);

  features.unshift(...globalConfiguration); // add global services

  occupyProvide(provider, closeGlobalContext => {
    features.forEach(featureFn => queue.add(done => MaybePromiseLike.then(() => featureFn(provider), done)));

    queue.add(finishTask => {
      provider.addDecoratedBy(BehaveLike);
      provider.addMissingDependencies();

      if (provider.has(RouteMatcher)) {
        provider(RouteMatcher).routeSet.addDecoratedBy(Route);
      }

      provider.preCacheSingletons(finishTask);
    });

    queue.add(finishTask => {
      provider._performStabilityCheck();
      closeGlobalContext();
      finishTask();
    });
  });

  queue.add(done => runnerLoader.then(done));
  return new Application(provider, queue);
}

export const make = { application: makeApplication };
