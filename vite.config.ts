import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import { nodeJsExternal } from './src/vite';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  // esbuild: false,
  build: {
    outDir: __dirname + '/dist',
    ssr: true,
    lib: {
      formats: ['cjs'],
      entry: {
        'index': __dirname + '/src/index.ts',
        'nodejs': __dirname + '/src/nodejs/index.ts',
        'sqlite3': __dirname + '/src/sqlite3/index.ts',
        'vite': __dirname + '/src/vite/index.ts',
        'firestore': __dirname + '/src/firestore/index.ts',
      },
    },
    sourcemap: true,
    minify: true,
    assetsDir: 'common',
    emptyOutDir: true,
    rollupOptions: {
      external: [...nodeJsExternal, 'sqlite3', 'firebase-admin/firestore', 'vite', '@rollup/plugin-swc', '@swc/types'],
    }
  },
  plugins: [typescript()],
});

