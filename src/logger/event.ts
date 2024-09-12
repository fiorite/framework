import { LogLevel } from './level';

export class LogEvent {
  private readonly _message: string;

  get message(): string {
    return this._message;
  }

  readonly _level: LogLevel;

  get level(): LogLevel {
    return this._level;
  }

  private readonly _timestamp: Date;

  get timestamp(): Date {
    return this._timestamp;
  }

  private readonly _error?: unknown;

  get error(): unknown | undefined {
    return this._error;
  }

  constructor(object: {
    readonly message: string;
    readonly level: LogLevel;
    readonly timestamp?: Date;
    readonly error?: unknown;
  }) {
    this._message = object.message;
    this._level = object.level;
    this._timestamp = object.timestamp || new Date();
    this._error = object.error;
  }
}
