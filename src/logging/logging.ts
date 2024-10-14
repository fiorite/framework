import { ServiceProvider } from '../di';
import { LogLevel } from './level';
import { ConsoleLogger } from './console';
import { Logger } from './logger';
import { LevelFilter } from './level-filter';

export const logLevel = Symbol.for('LogLevel');

export function addConsoleLogger(provider: ServiceProvider, level?: LogLevel) {
  level = level || LogLevel.Info;
  provider.addValue(logLevel, level);

  let logger: Logger = new ConsoleLogger();
  logger = new LevelFilter(logger, level!);
  provider.addValue(Logger, logger);
}
