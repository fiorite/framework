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
import { currentJsPlatform, JsPlatform, MaybePromiseLike, promiseWhenNoCallback, VoidCallback } from '../core';
import { featureHttpServer, httpServerPort } from './http-server';
import { dbCoreServices } from '../db';
import { featureConsoleLogger } from './logging';

class CallbackBusyStack {
  private _listeners: Function[] = [];
  private _callbacks = new Set<Function>();

  add(callback: (complete: VoidCallback) => void): void {
    this._callbacks.add(callback);
    callback(() => {
      this._callbacks.delete(callback);
      if (!this._callbacks.size) {
        while(this._listeners.length) {
          this._listeners.shift()!();
        }
      }
    });
  }

  all(complete: VoidCallback): void {
    if (!this._callbacks.size) {
      complete();
    } else {
      this._listeners.push(complete);
    }
  }
}

// todo: make reactive application which extends as it goes.
export class Application {
  private readonly _taskStack: CallbackBusyStack;
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

  constructor(provider: ServiceProvider, taskStack: CallbackBusyStack) {
    this._provider = provider;
    this._taskStack = taskStack;
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

  const taskStack = new CallbackBusyStack();

  taskStack.add(complete => {
    featureHttpServer(Number(currentJsPlatform === 'nodejs' ? (() => process.env['PORT'])() : 3000 || 3000), complete)(provider);
  });

  dbCoreServices(provider);

  runProviderContext(provider, complete => {
    features.forEach(featureFunction => featureFunction(provider));
    provider.addDecoratedBy(BehaveLike);
    provider.addMissingDependencies();
    const touchSingletons = true;

    if (provider.has(RouteMatcher)) {
      provider(RouteMatcher).routeSet.addDecoratedBy(Route);
    }

    if (touchSingletons) {
      taskStack.add(complete2 => provider.preCacheSingletons(complete2));
    }

    taskStack.all(() => {
      provider._performStabilityCheck();
      complete();
    });
  });

  return new Application(provider, taskStack);
}
