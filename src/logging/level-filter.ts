import { Logger } from './logger';
import { LogLevel } from './level';

export class LevelFilter extends Logger {
  constructor(source: Logger, level: LogLevel) {
    super(event => {
      if (event.level >= level) {
        source(event);
      }
    });
  }
}
