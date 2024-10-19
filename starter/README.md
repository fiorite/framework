## Starter App

Install packages:

```
npm install
```

Start development instance:

```
npm start
```

Build production instance:

```
npm run build
```

Explaining `src/hello.ts` and why it works:

- `Inherited` is Dependency Injection decorator which makes class injectable. 
- `HttpGet` is routing decorator (method defined as action) which parameters is automatically wired.

In case, one wonder the magic behind it, see comments below:

---
What is hidden (automatically generated)?

1. Entry script `src/main.ts` is auto-generated (in case you want to manage it manually, just create the file):

```typescript
import { makeApplication } from 'fiorite';

const app = makeApplication();

if (!import.meta.env.PROD) {
  app.start(() => log.info(`[server] server is running...`));
}
```

`makeApplication` loads decorators and default components (decorators like `Inherited`, `HttpGet` etc.).

2. `vite.config.ts` is configured by using `fiorite.json`. If you want to manage vite configuration, add the file and copy following and switch to `vite` and `vite build`:

```typescript
import { defineConfig } from 'vite';
import { bootstrapFiorite } from 'fiorite/vite';

export default defineConfig({
  plugins: bootstrapFiorite(__dirname),
});
```
