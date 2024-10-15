import { log, make } from 'fiorite';

export const app = make.application();

// @ts-ignore
if (import.meta.env.PROD) {
  app.start(() => log.info(`[server] server is running at http://localhost:unknown`));
}
