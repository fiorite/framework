# Fiorite Concept
It is TypeScript powered server framework done on callbacks which includes sugar from other big things: asp.net core, spring, express etc.

Currently, work in progress, maybe release will happen. 

## Getting started (need an update)

You decide the style of your app. It could be simple as:

```typescript
import { make, param } from 'fiorite';

const app = make.application();

app.routing
  .get('/', () => 'hello!')
  .get('/:name', ctx => `hello ${param(ctx, 'name')}!`);
```

Or OOP style:

```typescript
import { FromParam, HttpGet } from './fiorite';

class WelcomeController {
  constructor(
    @FromParam('name') readonly name?: string
  ) { }

  @HttpGet() welcomeAll() {
    return 'hello!';
  }

  @HttpGet('/:name=alpha') welcomeBy() {
    return `hello ${this.name}!`;
  }
}
```

