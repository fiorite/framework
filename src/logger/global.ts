import { provide } from '../service';
import { Logger } from './logger';

class ProvideContextLogger extends Logger {
  constructor() {
    super(event => provide(Logger, log => log(event)));
  }
}

export const log = new ProvideContextLogger();
