# Dependency Injection (DRAFT)

`emitDecoratorMetadata: true` in `tsconfig.json` is required.

---
**What are services?** - reusable parts which follow behavior patterns and can be projected by consumer code.

```typescript
import { Singleton } from 'fiorite';

@Singleton()
export class Incrementor {
  increment(i: number) {
    return i + 1;
  }
}
```

`Singleton` behavior is recommended for the best performance however, it has limitation. Let's, first, dive into other behavior patterns:

**There three main patterns of behavior** and their TypeScript decorators are:
1. `Singleton` - provides the same instance every time it gets asked.
2. `Scoped` - each, let's say, http request receives a copy of service and shares it within the request.
3. `Prototype` - creates a new service each time it gets provided.

`Singleton` limitation is that it cannot depend on `Scoped` service (e.g. `HttpContext`). 
In that case, prefer using `Scoped` decorator instead.

**There the fourth smart behavior pattern** which has not been mentioned, its name is `Inherited`.
Service provider analyses dependencies and assign `Scoped` whether dependency tree includes another `Scoped` service, otherwise `Singleton` is applied.

`Inherited` behaviour can be used as default one because it excludes the necessity of managing behaviour manually.
Trust this moment to Fiorite and focus on development.

---

- How to use a service?

In the following example `NumberService` injects `Incrementor` and its behavior is inherited from `Incrementor`.

```typescript
import { Inherited } from 'fiorite';
import { Incrementor } from './incrementor';

@Inherited()
export class NumberService {
  constructor(readonly incrementor: Incrementor) { }
}
```

---

- Can dependencies be manipulated?

The answer is yes, with help of `Provide` decorator. 
It allows to redefine source type and, optionally, project a new value from it by using map function `(value: T) => R`.

```typescript
import { Provide } from 'fiorite';
import { Incrementor } from './incrementor';

type IncrementFunction = (i: number) => number;

export class NumberService {
  constructor(
    @Provide(Incrementor, incrementor => (i: number) => incrementor.increment(i))
    readonly incrementor: IncrementFunction,
  ) { }
}
```

First argument points to service to source from and the second is map function. 
It results into `IncrementFunction` as constructor parameter. 

---

- Is it possible to implement own decorator and reuse it later? 

Yes, own decorator can be made like this:

```typescript
import { Provide } from 'fiorite';
import { Incrementor } from './incrementor';

type IncrementFunction = (i: number) => number;

const GetIncrementFunction = () => {
  return Provide(Incrementor, incrementor => {
    return (i: number) => incrementor.increment(i);
  }).calledBy(GetIncrementFunction);
};

export class NumberService {
  constructor(
    @GetIncrementFunction()
    readonly incrementor: IncrementFunction,
  ) { }
}
```

This is built on `Provide` and can be reused elsewhere. 

Unfamiliar `.calledBy()` is the way to point out that `GetIncrementFunction` is based on `Provide`. 
Whether you decide to build more complex pipeline, tracking decorator chain it is recommended. 

To access call chain, use:

```typescript
GetIncrementFunction().stackTrace; // [Provide, GetIncrementFunction]
```

---

- What are `ServiceSet` and `ServiceProvider`?

If there is no control over classes to use decorators, configuration can be done with help of `ServiceSet`.

```typescript
import { ServiceSet, ServiceProvider } from 'fiorite';

const serviceSet = new ServiceSet();
serviceSet.addValue(URL, new URL('http://localhost/'));
```

`addValue` is one of three ways of service binding. The other two are:
 
- `addType` - is for class constructors. e.g. `serviceSet.addType(NumberService)`,
- `addFactory` - uses callback to create an instance. Important to set dependencies. e.g.

```typescript

class StringUrlHost {
  constructor(readonly value: string) { }
}

const localhost = new StringUrlHost('http://localhost/');

serviceSet.addValue(localhost)
  .addFactory(URL, (host: StringUrlHost) => new URL(host.value), [
    StringUrlHost
  ]);
```

There behavior-specific methods in `ServiceSet`:

- `addSingleton`
- `addScoped`
- `addPrototype`
- `addInherited`

As well as two advanced ones:

- `includeDependencies` - walks through service dependencies and adds missing ones.
- `addDecoratedBy` - looks for classes marked by decorator in `DecoratorRecorder` and adds new ones.

```typescript
import { BehaveLike } from 'fiorite';

serviceSet.addDecoratedBy(BehaveLike)
  .includeDependencies();
```

`BehaveLike` is base for `Singleton`, `Scoped`, `Prototype` and `Inherited` decorators. 
Basically, `addDecoratedBy` scans every class decorated by `BehaveLike` or its implementors and adds to the list.

In case a specific decorator is made with the help of `makeClassDecorator`, it complies with `addDecoratedBy` and can add services automatically.

What are left to mention:
1. Synchronous and Asynchronous services.
2. How to test.
