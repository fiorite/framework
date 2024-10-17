import { defineConfig } from 'vite';
import { nodeJsExternal } from './src/vite';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  esbuild: {
    platform: 'neutral',
  },
  build: {
    outDir: __dirname + '/dist',
    ssr: true,
    lib: {
      formats: ['es'],
      entry: {
        'index': __dirname + '/src/index.ts',
        'nodejs': __dirname + '/src/nodejs/index.ts',
        'sqlite3': __dirname + '/src/sqlite3/index.ts',
        'firestore': __dirname + '/src/firestore/index.ts',
        'vite': __dirname + '/src/vite/index.ts',
        'cli': __dirname + '/src/cli.ts',
      },
    },
    sourcemap: 'hidden',
    emptyOutDir: true,
    rollupOptions: {
      external: [...nodeJsExternal, 'sqlite3', 'firebase-admin/firestore', '@rollup/plugin-typescript', 'reflect-metadata', '@swc/core', '@rollup/plugin-swc', 'fsevents', 'vite'],
    }
  },
  plugins: [typescript()],
});

