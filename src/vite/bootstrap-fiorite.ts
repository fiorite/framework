import { PluginOption } from 'vite';
import path from 'path';
import fs from 'node:fs';
import { nodeJsExternal } from './node-js-external';
import type { Application } from '../app';
import type { HttpServer } from '../http';
import { includeDotNode, replaceDirname } from './plugins';
import type { NodeJsHttpServer } from '../nodejs';
import swc from '@rollup/plugin-swc';
import type { Options as SwcOptions } from '@swc/core';
import typescript, { RollupTypescriptOptions, RollupTypescriptPluginOptions } from '@rollup/plugin-typescript';

/**
 * Directory where vite config exists, or project root.
 * In mono repo, use subproject path.
 */
export const bootstrapFiorite = (projectDir: string, options: {
  readonly src?: string;
  readonly dist?: string;
  readonly main?: string;
  readonly external?: string[];
  readonly appVar?: string; // 'app' is default
  readonly autoImport?: boolean | string | string[];
  readonly compiler?: 'swc' | 'typescript'; // implement choice
  readonly swc?: SwcOptions;
  readonly typescript?: RollupTypescriptPluginOptions;
} = {}): PluginOption[] => {
  const resolvePath = (subpath: string): string => {
    return path.isAbsolute(subpath) ? subpath : path.resolve(projectDir, subpath);
  }

  const srcDir = options.src || path.resolve(projectDir + '/src');

  const mainName = options.main || 'main.ts';
  const mainPath = path.resolve(srcDir, mainName);
  let generateMain = false;

  if (!fs.existsSync(mainPath)) {
    // main.ts is aut generated
    generateMain = true;
    console.warn(`${mainName} will be generated automatically.`);
  }

  const outDir = options.dist || projectDir + '/dist';
  const exportVar = options.appVar || 'app';

  let transform: (code: string, id: string, options?: { ssr?: boolean; }) => unknown = (code) => code;
  const plugins: PluginOption[] = [];
  let compiler: PluginOption; // plugin

  if (options.compiler === 'typescript') {
    // asser !options.swc

    const typescriptOptions: RollupTypescriptOptions = {};

    if (options.typescript) {
      Object.assign(typescriptOptions, options.typescript);
    } else {
      const tsconfigPath = projectDir + '/tsconfig.json';

      if (fs.existsSync(tsconfigPath)) {
        typescriptOptions.tsconfig = tsconfigPath;
      }
    }

    compiler = typescript(typescriptOptions);
    plugins.push(compiler);
  } else {
    let swcOptions: SwcOptions = {
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
    };

    const swcrcPath = projectDir + '/.swcrc';

    if (fs.existsSync(swcrcPath)) {
      Object.assign(swcOptions, JSON.parse(fs.readFileSync(swcrcPath).toString())); // todo: add error: invalid json
    }

    if (options.swc) {
      Object.assign(swcOptions, options.swc);
    }

    compiler = swc({ swc: swcOptions });
    transform = compiler.transform as any;
  }

  // region automatic import

  const { autoImport } = options;
  let autoImportEnabled = true;
  let autoImportPaths = [];

  if (typeof autoImport === 'string') { // handle path
    autoImportPaths.push(resolvePath(autoImport));
  } else if (Array.isArray(autoImport)) { // handle path
    autoImportPaths.push(...autoImport.map(resolvePath));
  } else if (true === autoImport) { // set root as importAll
    autoImportPaths.push(projectDir);
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
        } else if (path.endsWith('.ts') && path !== mainPath) {
          files.push(path);
        }
      }

      return files;
    };

    const mainDirname = path.dirname(mainPath); // todo: create a separate file holder called auto-import.ts
    const generatedCode = autoImportPaths.flatMap(importDir => scanAll(importDir))
      .map(path => '.' + path.substring(mainDirname.length, path.length - 3))
      .map(path => `import '${path}';`).join('\n');

    return generatedCode + '\n\n';
  };

  // endregion

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
            input: mainPath,
            external: [...nodeJsExternal, ...(options.external ? options.external : [])],
          },
          assetsDir: '.',
          emptyOutDir: true,
          sourcemap: 'hidden',
        },
        esbuild: false,
        server: {
          hmr: false,
        },
      }),
      load: id => {
        if (generateMain && id === mainPath) {
          return {
            code: [
              `/** system: generate main turned on: ${mainName} */`,
              `import { log, makeApplication } from 'fiorite';`,
              `export const ${exportVar} = makeApplication();`,
              `// @ts-ignore`,
              `if (import.meta.env.PROD) {`,
              `  ${exportVar}.start(() => log.info(\`[server] server is running...\`));`,
              `}`,
            ].join('\n'),
          };
        }
      },
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
            const mod = await server.ssrLoadModule(mainPath);
            app = mod[exportVar]; // todo: add check if file exists and error
            appServer = app.httpServer;
          } catch (err) {
            console.error(err);
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
          if (autoImportEnabled && id === mainPath) {
            code = makeAutoImportCode() + code;
          }
          return transform(code, id, options);
        }
        return;
      },
    } as PluginOption,
    ...plugins,
    includeDotNode(),
    replaceDirname(),
  ];
};
