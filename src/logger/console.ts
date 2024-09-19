import { LogLevel } from './level';
import { Logger } from './logger';
import { ServiceCollection } from '../service';
import { LevelFilter } from './level-filter';

// Reset = "\x1b[0m"
// Bright = "\x1b[1m"
// Dim = "\x1b[2m"
// Underscore = "\x1b[4m"
// Blink = "\x1b[5m"
// Reverse = "\x1b[7m"
// Hidden = "\x1b[8m"
//
// FgBlack = "\x1b[30m"
// FgRed = "\x1b[31m"
// FgGreen = "\x1b[32m"
// FgYellow = "\x1b[33m"
// FgBlue = "\x1b[34m"
// FgMagenta = "\x1b[35m"
// FgCyan = "\x1b[36m"
// FgWhite = "\x1b[37m"
// FgGray = "\x1b[90m"
//
// BgBlack = "\x1b[40m"
// BgRed = "\x1b[41m"
// BgGreen = "\x1b[42m"
// BgYellow = "\x1b[43m"
// BgBlue = "\x1b[44m"
// BgMagenta = "\x1b[45m"
// BgCyan = "\x1b[46m"
// BgWhite = "\x1b[47m"
// BgGray = "\x1b[100m"

export class ConsoleLogger extends Logger {
  constructor() {
    super(event => {
      let levelString: string;
      const timestamp = event.timestamp;

      switch (event.level) {
        case LogLevel.Debug:
          levelString = '\x1b[90mDBG\x1b[0m';
          break;
        case LogLevel.Info:
          levelString = '\x1b[36mINF\x1b[0m';
          break;
        case LogLevel.Warn:
          levelString = '\x1b[33mWRN\x1b[0m';
          break;
        case LogLevel.Error:
          levelString = '\x1b[37m\x1b[41mERR\x1b[0m';
          break;
      }

      const parts = [
        `[${
          [[
            timestamp.getHours().toString().padStart(2, '0'),
            timestamp.getMinutes().toString().padStart(2, '0'),
            timestamp.getSeconds().toString().padStart(2, '0')
          ].join(':') + '.' + timestamp.getMilliseconds().toString().padStart(3, '0'), levelString!].filter(x => !!x && x.length).join(' ')
        }]`,
        // [
        //   '\x1b[32m'+event.context+'\x1b[0m'
        // ].filter(x => !!x).map(x => `(${x})`),
        event.message
      ].filter(x => !!x && x.length).join(' ');

      switch (event.level) {
        case LogLevel.Debug:  // stdout
          console.debug(parts);
          break;
        case LogLevel.Info:  // stdout
          console.info(parts);
          break;
        case LogLevel.Warn: // stderr
          console.warn(parts);
          break;
        case LogLevel.Error:  // stderr
          console.error(parts);
          break;
      }
    });
  }
}

export function addConsoleLog(configure: ServiceCollection, level?: LogLevel): void {
  let logger: Logger = new ConsoleLogger();
  if (level) {
    logger = new LevelFilter(logger, level!);
  }
  configure.addInstance(Logger, logger);
}
