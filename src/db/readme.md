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

For later:
[ ] or/and where conditions, need time to work through. if OR needed, prefer TypeORM-ish which support advanced query. 
```
