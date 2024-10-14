import { PluginOption } from 'vite';
import path from 'path';
import fs from 'node:fs';
import swc from '@rollup/plugin-swc';
import { nodeJsExternal } from './node-js-external';
import type { Application } from '../app';
import type { HttpServer } from '../http';
import type { Options as SWCOptions } from '@swc/types';
import { includeDotNode } from './include-dot-node';
import { replaceDirname } from './replace-dirname';
import type { NodeJsHttpServer } from '../http/nodejs';

/**
 * Directory where vite config exists, or project root.
 * In mono repo, use subproject path.
 */
export const bootstrapFiorite = (projectDir: string, config: {
  readonly srcDir?: string;
  readonly outDir?: string;
  readonly mainTs?: string;
  readonly rollupExternal?: string[];
  readonly appVar?: string; // 'app' is default
  readonly importAll?: boolean | string | string[];
  readonly swcOpts?: SWCOptions;
} = {}): PluginOption[] => {
  const srcDir = config.srcDir || path.resolve(projectDir + '/src');
  const absoluteMainTs = path.resolve(srcDir, config.mainTs || 'main.ts');
  const outDir = config.outDir || path.resolve(projectDir, '/dist');

  // region automatic import

  const { importAll } = config;
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

  const makeAutoImportCode = (): string => {
    if (!autoImportEnabled) {
      return '';
    }

    const scanAll = (dir: string, exclude = ['node_modules']): string[] => {
      const queue = fs.readdirSync(dir).map(file => `${dir}/${file}`);
      const files = [];

      while (queue.length) {
        const path = queue.shift()!;
        if (fs.statSync(path).isDirectory() && !exclude.includes(path)) {
          queue.push(...fs.readdirSync(path).map(file => `${path}/${file}`));
        } else if (path.endsWith('.ts') && path !== absoluteMainTs) {
          files.push(path);
        }
      }

      return files;
    };

    const mainDirname = path.dirname(absoluteMainTs); // todo: create a separate file holder called auto-import.ts
    const generatedCode = autoImportPaths.flatMap(importDir => scanAll(importDir))
      .map(path => '.' + path.substring(mainDirname.length, path.length - 3))
      .map(path => `import '${path}';`).join('\n');

    return generatedCode + '\n\n';
  };

  // endregion

  // const importDir = typeof importAll === ;

  const tsCompiler = swc(config.swcOpts || {
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

  const transformTs = (code: string, id: string, options?: { ssr?: boolean; }) =>
    (tsCompiler.transform as Function)(code, id, options);

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
          emptyOutDir: true,
        },
        esbuild: false,
        server: {
          hmr: false,
        },
      }),
      configureServer: (server) => {
        let app: Application;
        let appServer: HttpServer;
        let timer: NodeJS.Timeout;

        const fsEvents = ['add', 'change', 'unlink'];

        const tsFilterEvent = (filename: string) => {
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

        server.httpServer!.once('listening', async () => {
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
            appServer.platformRunner.then(runner => (runner as NodeJsHttpServer)(req, res));
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
      },
    } as PluginOption,
    includeDotNode(),
    replaceDirname(),
  ];
};
