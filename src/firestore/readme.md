```typescript
import { makeDbModel } from 'fiorite';
import { firestoreDocumentId } from 'fiorite/firestore';

export const connModel = makeDbModel<{ id: string }>('items', b => {
  return {
    id: b.string.name(firestoreDocumentId).key,
  };
});
```
