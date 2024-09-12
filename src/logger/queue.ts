import { LogEvent } from './event';
import { Logger } from './logger';

/** @deprecated will be used for system messages up until configuration */
export class LogEventQueue extends Logger implements Iterable<LogEvent> {
  private _data: LogEvent[] = [];

  get size(): number {
    return this._data.length;
  }

  constructor() {
    super(event => this._data.push(event));
  }

  poll(): LogEvent {
    if (!this._data.length) {
      throw new Error('Log event queue is empty');
    }
    return this._data.shift()!;
  }

  [Symbol.iterator](): Iterator<LogEvent> {
    return this._data[Symbol.iterator]();
  }
}
