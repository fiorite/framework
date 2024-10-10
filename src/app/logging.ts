import { ServiceProvider } from '../di';
import { ConsoleLogger, LevelFilter, Logger, LogLevel } from '../logging';
import { ApplicationFeature } from './feature';

export class ConsoleLoggerFeature implements ApplicationFeature {
  constructor(readonly level?: LogLevel) {
  }

  configure(provider: ServiceProvider) {
    let logger: Logger = new ConsoleLogger();
    if (this.level) {
      logger = new LevelFilter(logger, this.level!);
    }
    provider.addValue(Logger, logger);
  }
}

export function addConsoleLogger(level?: LogLevel): ConsoleLoggerFeature {
  return new ConsoleLoggerFeature(level);
}
