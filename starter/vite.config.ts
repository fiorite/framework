import { defineConfig } from 'vite';
import { bootstrapFiorite } from 'fiorite/vite';

export default defineConfig({
  server: { port: 3000 },
  plugins: bootstrapFiorite(__dirname, { autoImport: 'src' }),
});

