# Fiorite Concept
It is TypeScript powered server framework which includes sugar from other big things: asp.net core, spring, express etc.

Currently, work in progress, maybe release will happen. 

## Getting started

You decide the style of your app. It could be simple as:

```typescript
import { add, cors, get, log, logger, make, provide } from 'fiorite/short';

make.application(                         // 1. setup your application
  logger.console(),                       // 2. add console logger
  cors(),                                 // 3. add cors middleware
  add('message', () => 'hello world!'),   // 4. add service with 'message' id
  get('/', () => {                        // 5. add GET '/' route
    const message = provide('message');   // 6. provide the message
    log.info('/ => ' + message);          // 7. log the message into console
    return message;                       // 8. response with 'hello world!';
  }),
).listen(3000);                           // 9. start webserver at 3000 port.

```

Or more complex style (OOP):

```typescript
import { addConsoleLogger, addCors, addRouting, addService, HttpGet, Logger, makeApplication, Provide } from './fiorite';

class MessageHost {
  constructor(readonly message: string) {
  }
}

class Controller {
  constructor(@Provide() logger: Logger) {
  }

  @HttpGet()
  getMessage(host: MessageHost): string {
    const message = host.message;
    this.logger.info('/ => ' + message);
    return message;
  }
}

const messageHost = new MessageHost('Hello world!');

const application = makeApplication(
  addConsoleLogger(),
  addCors(),
  addService(messageHost),
  addRouting(Controller),
);

application.listen(3000);
```

Cookbook ideas below:

```typescript
import { get, param } from './fiorite';

get('/hi/:to=length(1,64)', ctx => {      // 1. add route parameter with length
  return 'hi ' + param(ctx, 'to');        // 2. response with greeting
});
```
