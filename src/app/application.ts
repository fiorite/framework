import {
  BehaveLike,
  runProviderContext,
  ServiceConfigureFunction,
  ServiceProvideAsyncFunction,
  ServiceProvideFunction,
  ServiceProvider,
  ServiceType
} from '../di';
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

// todo: make reactive application which extends as it goes.
export class Application {
  private readonly _provider: ServiceProvider;
  private readonly _queue: CallbackQueue;

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

  constructor(provider: ServiceProvider, queue: CallbackQueue) {
    this._provider = provider;
    this._queue = queue;
  }

  within(callback: (complete: VoidCallback) => void): void {
    runProviderContext(this._provider, callback);
  }

  ready(callback: VoidCallback): void {
    this._queue.on('empty', callback);
  }

  start(callback: VoidCallback): void;
  start(): PromiseLike<void>;
  start(callback?: VoidCallback): unknown {
    return promiseWhenNoCallback<void>(callback => {
      this._queue.on('empty', () => {
        runProviderContext(this._provider, complete => {
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
  // @ts-ignore
  const development = !(import.meta as any).env?.PROD && process.env['NODE_ENV'] === 'development';
  provider.addValue(Symbol.for('development'), development);
  addConsoleLogger(provider, development ? LogLevel.Debug : undefined); // todo: make configurable
  addDbManager(provider);
  addEvents(provider);

  // enqueue all the features:

  const queue = new CallbackQueue();

  const runnerLoader = ComputedCallback.preCache<void>(done => {
    const port = Number(currentJsPlatform === 'nodejs' ? (() => process.env['PORT'])() : 3000 || 3000);
    addHttpServer(provider, port, done);
  });

  addRouting(provider);
  addCors(provider);
  addJsonParser(provider);

  runProviderContext(provider, closeGlobalContext => {
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
