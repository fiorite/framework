# Fiorite Concept

Fiorite is build with `@rollup/plugin-typescript` however, app is using `@rollup/plugin-swc` since `esbuild` has an issue with `emitDecoratorMetadata`.

Entries:
```
- fiorite - anything code related
- fiorite/vite - development plugins
- fiorite/sqlite3 
- fiorite/nodejs - http adapter
- fiorite/idb - if done for browser
- fiorite/firestore - firebase
```

---

**As for v0.0.n source base is under testing in a real project, test coverage and documentation will be implemented later. During this period there no stability nor breaking changes guarantee.**
Ideas what is the very first version should be done in a form of a plan.

In order to try it, run `npm install fiorite --save` and start exploring.

If you are interested in contributing based on what you see in this repository, text me!

----------------------------------

Points from the author:
- DI with behavior which prototypes instances per request `Scoped` and has `Inherited` auto behavior which analyses dependency tree and picks the right type for current service.
- Vite used for development and build: hot restarts, auto-import feature and others.
- Potentially, good testability and tools to debug code (code design in itself).
- Callbacks as the core approach. User level is `PromiseLike`-friendly.
- iterable component will evolve into rxjs-like stream processing but preserves `Iterable/AsyncIterable` native support.
- DB modeling is designed to be fully compatible with JS language (only three types supported: `string`, `number` and `boolean`) and the least ask to learn implementation. Inconvenience is that current version lacks of feature and require time to learn and make the next steps.
- Service provider and routing matcher are live instances, developer is not locked into building steps to follow. Plus, pretty easy way to extend features simply by interacting with current service provider.
- Routing is experimental, which supports parameter constrains as ASP.NET does, including three styles of mapping `{param}`, `:param` and `@param`.
- Framework intents not to use external packages to organize the code. In case integrating other services, adapters should be done.
- Code should be compatible with both NodeJS and Browser environment, so in future communicating serve/client can be done out-of-the box as well as consuming additional features on both sides.
- Having benefits of OOP/FP in a single tool.
- **There still a lot of work however, Fiorite was created as a learning subject and it is a journey to create a better JS development experience. Cheers!**

---

Recent version of readme:

It is TypeScript powered server framework done on callbacks which includes sugar from other big things: asp.net core, spring, express etc.

Short component drafts:

## Dependency Injection

Simple:
```typescript
import { make, param } from 'fiorite';

const provider = make.application().provider;
provider.add('name', 'John');
provider.get('name'); // name
```

Advanced:

```typescript
import { Inherited } from 'fiorite';

@Inherited()
class NameHolder {
  constructor(readonly name: string) {
  }
}
```

## Routing

Simple:

```typescript
import { make, param } from 'fiorite';

export const app = make.application();

app.routing.get('/', () => 'hello!')
  .get('/:name', ctx => `hello ${param(ctx, 'name')}!`);
```

Advanced:

```typescript
import { FromParam, HttpGet } from 'fiorite';

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

## Database

```typescript
import { fromDb, makeDbModel } from 'fiorite';

interface Item { // 0. have a structure
  readonly id: number;
  readonly name: string;
}

const itemModel = makeDbModel<Item>('items_tbl', x => { // 1. map a model
  return { id: x.number.key, name: x.string };
});

const itemTable = fromDb(itemModel); // 2. source the table

const idSubset = itemTable.where('name', '!=', undefined) // 3. setup id subset
  .skip(1)
  .take(5)
  .map(item => item.id);

itemTable.where('id', 'in', idSubset).toArray(console.log); // 4. query where id in subset
```
