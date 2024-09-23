# Fiorite Concept
It is TypeScript powered server framework which includes sugar from other big things: asp.net core, spring, express etc.

Currently, work in progress, maybe release will happen. 

## Getting started

```typescript
import { add, cors, get, log, logger, make, provide } from 'fiorite';

// setup your application
make.application(
  // add console logger
  logger.console(),

  // add cors middleware
  cors(),

  // add service with 'message' id
  add('message', () => 'hello world!'),

  // add GET '/' route
  get('/', () => {
    // provide the message
    const message = provide('message');

    // log the message into console:
    log.info('/ => ' + message); // / => hello world!

    // respond with 'hello world!';
    return message;
  }),
).listen(3000); // start webserver at 3000 port.

```

