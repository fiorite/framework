import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import { nodeJsExternal } from './src/vite';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    outDir: __dirname + '/dist',
    ssr: true,
    rollupOptions: {
      input: {
        'index': __dirname + '/src/all.ts',
        'nodejs': __dirname + '/src/nodejs/index.ts',
        'sqlite3': __dirname + '/src/sqlite3/index.ts',
        'vite': __dirname + '/src/vite/index.ts',
        'firestore': __dirname + '/src/firestore/index.ts',
      },
      external: [...nodeJsExternal, 'sqlite3', 'firebase-admin', 'vite'],
    }
  },
  optimizeDeps: {
    exclude: [...nodeJsExternal, 'sqlite3', 'firebase-admin', 'vite'],
  },
  plugins: [
    typescript({
      downlevelIteration: true,
      include: ['src'],
    })
  ],
});

