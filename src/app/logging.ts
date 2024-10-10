import { ConsoleLogger, LevelFilter, Logger, LogLevel } from '../logging';
import { ApplicationConfigureFunction } from './application';

export const logLevel = Symbol.for('LogLevel');

export function featureConsoleLogger(level?: LogLevel): ApplicationConfigureFunction {
  return provider => {
    level = level || LogLevel.Info;
    provider.addValue(logLevel, level);

    let logger: Logger = new ConsoleLogger();
    logger = new LevelFilter(logger, level!);
    provider.addValue(Logger, logger);
  };
}
