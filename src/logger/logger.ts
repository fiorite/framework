import { LogEvent } from './event';
import { FunctionClass } from '../core';
import { LogFunction } from './function-type';
import { LogLevel } from './level';

export interface Logger extends LogFunction {
  debug(message: string): void;

  info(message: string): void;

  warn(message: string): void;

  error(message: string, error?: unknown): void;
}

export abstract class Logger extends FunctionClass<LogFunction> {
  debug(message: string): void {
    const event = new LogEvent({message, level: LogLevel.Debug});
    return this(event);
  }

  info(message: string): void {
    const event = new LogEvent({message, level: LogLevel.Info});
    return this(event);
  }

  warn(message: string): void {
    const event = new LogEvent({message, level: LogLevel.Warn});
    return this(event);
  }

  error(message: string, error?: unknown): void {
    const event = new LogEvent({message, level: LogLevel.Error, error});
    return this(event);
  }
}

