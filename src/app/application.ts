import {
  occupyProvide,
  ServiceConfigureFunction,
  ServiceProvideAsyncFunction,
  ServiceProvideFunction,
  ServiceProvider,
  ServiceType
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
import { lateScripts, ScriptFunction } from './run-script';
import { lateServiceConfigurations } from '../di/configure';

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
    provider.add(this);
    queue.on('empty', () => {
      lateScripts.forEach(lateScript => this.runScript(lateScript));
    });
  }

  runScript(callback: ScriptFunction): void {
    occupyProvide(this._provider, unbind => {
      callback.length > 0 ? callback(unbind) : MaybePromiseLike.then(() => (callback as Function)(), unbind);
    });
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

  queue.add(done => {
    // @ts-ignore
    const port = Number(currentJsPlatform === 'nodejs' ? (() => process.env['PORT'])() : 3000 || 3000);
    addHttpServer(provider, port, done);
  });

  addRouting(provider);
  addCors(provider);
  addJsonParser(provider);

  features.unshift(...lateServiceConfigurations); // add global services

  occupyProvide(provider, unbind => {
    features.forEach(configureServices => {
      queue.add(done => {
        configureServices.length > 1 ? configureServices(provider, done) :
          MaybePromiseLike.then(() => configureServices(provider), done);
      });
    });

    queue.add(done => {
      provider.addDecoratedBy(BehaveLike);
      provider.addMissingDependencies();

      if (provider.has(RouteMatcher)) {
        provider(RouteMatcher).routeSet.addDecoratedBy(Route);
      }

      provider.preCacheSingletons(done);
    });

    queue.add(done => {
      provider._performStabilityCheck();
      unbind();
      done();
    });
  });

  return new Application(provider, queue);
}

export const make = { application: makeApplication };
