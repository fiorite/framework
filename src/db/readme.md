## Database component todo:

```text
[ ] design three level db implementation: reader, +writer, +management (migrations).

- level #1: DbReader (run a query, return AsyncIterable and have specific operation optimization)
- level #2: DbWriter (add, change, delete operations: value auto-generation)
- level #3: DbDesigner (migrations etc.)

[ ] add in-memory database, which share state after restart (vite)

component is experimental, roadmap is long-term research. some points:
- add Date, Uint8Array (Blob) field types;
- add relationship/references field type;
- add where value reference to another model;

[ ] couple adapters: in-memory db, sqlite3, mysql, firestore and http-based db.
[ ] adapter tells supported types, apparently, if type is not supported, provide fallback.

Next version might include (for now simple implementation is done, CRUD + reactive approach):
[ ] or/and where conditions, need time to work through. if OR needed, prefer TypeORM-ish which support advanced query. 
[ ] subquery support
[ ] migrations API
[ ] relationship (many-to-many, one-to-many, one-to-one, many-to-one)
[ ] custom types, and date, binary enum idk. 
```

How to map a model?

Have an interface, put

```typescript
import { makeDbModel } from 'fiorite';

interface DbItem {
  readonly id: string;
  readonly title: string;
  readonly seen: boolean;
}

const itemModel = makeDbModel<DbItem>('items', field => {
  return {
    id: column.string.key, // .key getter marks field as primary, 
    title: column.string,  // ... one can mark several fields to have a composite key.
    seen: column.boolean.default(false as any),
  };
});
```

How to access db sequence?

```typescript
import { fromDb, log } from 'fiorite';

const itemsCount = await fromDb(itemModel).count();
log.info(itemModel.name + ' has ' + itemsCount + ' item(s).');
```
