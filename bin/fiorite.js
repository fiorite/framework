#!/usr/bin/env node

import path from "path";
import fs from "node:fs";
import swc from '@rollup/plugin-swc';
import { createServer } from 'vite';

const [, , command, ...args] = process.argv;

export const replaceDirname = () => {
  return {
    name: 'replace-dirname',
    transform(code) {
      if (code.includes('__dirname')) {
        const replacement = `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`;
        return code.replaceAll(`__dirname`, replacement);
      }
      return code;
    },
  };
};

export const includeDotNode = () => {
  const files = [];
  return {
    name: 'include-dot-node',
    transform(_, id) {
      if (id.endsWith('.node')) {
        files.push(id);
        return 'import module from \'node:module\';\nexport default module.createRequire(import.meta.url)(\'' + id + '\');\n';
      }
    },
    load: (id) => id.endsWith('.node') ? '' : null,
    generateBundle(options) {
      for (const file of files) {
        const output = path.resolve(options.dir + '/' + path.basename(file));
        fs.mkdirSync(path.dirname(output), {recursive: true});
        fs.writeFileSync(output, fs.readFileSync(file));
      }
    },
  };
};

export const nodeJsExternal = [
  'async_hooks',
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'net',
  'os',
  'module',
  'path',
  'punycode',
  'querystring',
  'process',
  'readline',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
].reduce((result, builtin) => {
  result.push(builtin, 'node:' + builtin);
  return result;
}, []);

/**
 * Directory where vite config exists, or project root.
 * In mono repo, use subproject path.
 */
export const bootstrapFiorite = (projectDir, config) => {
  const srcDir = config.srcDir || path.resolve(projectDir + '/src');
  const absoluteMainTs = path.resolve(srcDir, config.mainTs || 'main.ts');
  const outDir = config.outDir || projectDir + '/dist';

  // region automatic import

  const {importAll} = config;
  let autoImportEnabled = true;
  let autoImportPaths = [];
  if (typeof importAll === 'string') { // handle path
    autoImportPaths.push(importAll);
  } else if (Array.isArray(importAll)) { // handle path
    autoImportPaths.push(...importAll);
  } else if (true === importAll) { // set root as importAll
    autoImportPaths.push(path.dirname(absoluteMainTs));
  } else {
    autoImportEnabled = false;
  }

  const makeAutoImportCode = () => {
    if (!autoImportEnabled) {
      return '';
    }

    const scanAll = (dir, exclude) => {
      if (!exclude) {
        exclude = ['node_modules'];
      }
      const queue = fs.readdirSync(dir).map(file => `${dir}/${file}`);
      const files = [];

      while (queue.length) {
        const path = queue.shift();
        if (fs.statSync(path).isDirectory() && !exclude.includes(path)) {
          queue.push(...fs.readdirSync(path).map(file => `${path}/${file}`));
        } else if (path.endsWith('.ts') && path !== absoluteMainTs) {
          files.push(path);
        }
      }

      return files;
    }

    const mainDirname = path.dirname(absoluteMainTs); // todo: create a separate file holder called auto-import.ts
    const generatedCode = autoImportPaths.flatMap(importDir => scanAll(importDir))
      .map(path => '.' + path.substring(mainDirname.length, path.length - 3))
      .map(path => `import '${path}';`).join('\n');

    return generatedCode + '\n\n';
  };

  // endregion

  const tsCompiler = swc({
    swc: {
      cwd: projectDir,
      module: {
        type: 'nodenext',
      },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        target: 'esnext',
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    },
  });

  const transformTs = (code, id, options) =>
    (tsCompiler.transform)(code, id, options);

  return [
    {
      name: 'fiorite-bootstrap',
      config: (_, env) => ({
        root: projectDir,
        ssr: {
          noExternal: env.command === 'build' ? true : undefined,
        },
        build: {
          ssr: true,
          outDir,
          rollupOptions: {
            input: absoluteMainTs,
            external: config.rollupExternal || nodeJsExternal,
          },
          assetsDir: '.',
          emptyOutDir: true,
          // sourcemap: true,
        },
        esbuild: false,
        server: {
          hmr: false,
        },
      }),
      configureServer: (server) => {
        let app;
        let appServer;
        let timer;

        const fsEvents = ['add', 'change', 'unlink'];

        const tsFilterEvent = (filename) => {
          if (filename.endsWith('.ts') || filename.endsWith('.json')) {
            scheduleRestart();
          }
        };

        const scheduleRestart = () => {
          clearTimeout(timer);
          timer = setTimeout(async () => {
            fsEvents.forEach(event => server.watcher.off(event, tsFilterEvent));
            await server.restart();
          }, 100);
        };

        fsEvents.forEach(event => server.watcher.on(event, tsFilterEvent));

        server.httpServer.once('listening', async () => {
          try {
            const mod = await server.ssrLoadModule(absoluteMainTs);
            app = mod[config.appVar || 'app']; // todo: add check if file exists and error
            appServer = app.httpServer;
          } catch (err) {
            console.error(err);
            throw err;
          }
        });

        server.middlewares.use((req, res) => {
          app.within(complete => {
            appServer.platformRunner.then(runner => (runner)(req, res));
            res.on('close', complete); // todo: extend lifecycle and perhaps connect to scope lifetime.
          });
        });
      },
      transform: (code, id, options) => {
        if (id.endsWith('.ts')) {
          if (autoImportEnabled && id === absoluteMainTs) {
            code = makeAutoImportCode() + code;
          }
          return transformTs(code, id, options);
        }
        return code;
      },
    },
    includeDotNode(),
    replaceDirname(),
  ];
}


if (!command) {
  // console.log('start', process.cwd());

  createServer({
    server: {
      port: 3000,
    },
    plugins: [
      ...bootstrapFiorite(process.cwd(), {
        // outDir: __dirname + '/../../dist/api-node',
        importAll: true,
      })
    ],
  }).then(server => server.listen());
}

if ('build' === command) {
  console.log('build');
}
