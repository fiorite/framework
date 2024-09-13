import { provide } from '../service';
import { Logger } from './logger';

class ProvideContextLogger extends Logger {
  constructor() {
    super(event => provide(Logger, log => log(event)));
  }
}

/** @deprecated problems with vite rn */
export const log = new ProvideContextLogger();
