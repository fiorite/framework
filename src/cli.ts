#!/usr/bin/env node

import {build, createServer} from 'vite';
import {bootstrapFiorite} from './vite';

// @ts-ignore
const [, , command, ...args] = process.argv;

(async () => {
  if (!command) {
    const server = await createServer({
      plugins: bootstrapFiorite(process.cwd()),
    });
    await server.listen();
  }

  if ('build' === command) {
    await build({
      plugins: bootstrapFiorite(process.cwd()),
    });
  }
})();
