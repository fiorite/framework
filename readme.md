# Fiorite Concept
It is TypeScript powered server framework done on callbacks which includes sugar from other big things: asp.net core, spring, express etc.

Currently, work in progress, maybe release will happen. 

Short examples:

## DI

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

## DB

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
