import { ConsoleLogger, LevelFilter, Logger, LogLevel } from '../logging';
import { ServiceProvider } from '../di';

export const logLevel = Symbol.for('LogLevel');

export function addConsoleLogger(provider: ServiceProvider, level?: LogLevel) {
  level = level || LogLevel.Info;
  provider.addValue(logLevel, level);

  let logger: Logger = new ConsoleLogger();
  logger = new LevelFilter(logger, level!);
  provider.addValue(Logger, logger);
}
