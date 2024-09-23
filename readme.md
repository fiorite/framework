# Fiorite Concept
It is TypeScript powered server framework which includes sugar from other big things: asp.net core, spring, express etc.

Currently, work in progress, maybe release will happen. 

## Getting started

```typescript
import { add, cors, get, log, logger, make, provide } from 'fiorite';

make.application(                         // 1. setup your application
  logger.console(),                       // 2. add console logger
  cors(),                                 // 3. add cors middleware
  add('message', () => 'hello world!'),   // 4. add service with 'message' id
  get('/', () => {                        // 5. add GET '/' route
    const message = provide('message');   // 6. provide the message
    log.info('/ => ' + message);          // 7. log the message into console
    return message;                       // 8. respond with 'hello world!';
  }),
).listen(3000);                           // 9. start webserver at 3000 port.

```

