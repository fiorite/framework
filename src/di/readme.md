# Dependency Injection

**What are services?** - reusable parts which follow behavior patterns and can be projected by consumer code.

`emitDecoratorMetadata: true` in `tsconfig.json` is required.

## 1. Getting started

Eveything is built into `ServiceProvider`, simply make an instance and start building dependencies.

```typescript
import { ServiceProvider } from 'fiorite';

// 0. Create service provider.
const provider = new ServiceProvider();
```

Each service has a type `ServiceType<T>`. Servce type could be `string | symbol | Type<T>`. One can decide oneself which style to use.

```typescript
// 1. Add value as a service with key "numberValue".
provider.add('numberValue', 100);

// 2.1. Describe a class with the only number #value.
class MyNumber {
  constructor(readonly value: number) {
  }
}

// 2.2. Add type as a service and specify dependencies.
provider.add(MyNumber, ['numberValue']);

// 3. Access services and compare them.
const value1 = provider.get('numberValue'); // 100
const value2 = provider.get(MyNumber).value; // 100
console.log(value1 === value2); // true
```

`ServiceProvider` is `Function` which uses `get` on call.

```typescript
provider(MyNumber) === provider.get(MyNumber); // true
```

Methods used to configure `ServiceProvider`:

- `add`
- `addValue`
- `addFactory`
- `addType`
- `addInherited`
- `addSingleton`
- `addScoped`
- `addPrototype`

Methods used to get service instances or values:

- `get`
- `getAll`
- `async` - `Promise` if service binding is asynchronous. `get` will throw an error when unable to get synchronous result. To be safe, two alternatives are there:
  - `provider.get(type, x => { /* ... */ });` - callback
  - `const x = await provider.async(type);` - async/await
- `asyncAll`
- `()` call as a function is alias of `get`.

## 2. Object-oriented way and behaviors

As app grows, more tools are required. Inspired by ASP.NET, Spring and Angular, Fiorite incorporates DI features like: class/parameter decorators, service behavior (lifetime/lifecycle), global scope binding of `provide()` etc.

```typescript
import { Singleton } from 'fiorite';

@Singleton()
export class Incrementor {
  increment(i: number) {
    return i + 1;
  }
}
```

`Singleton` decorator marks class as a singleton service. It means that instance is shared across all requests.
`Singleton` is recommended for the best performance.

`Singleton` is one of **four service behaviors**:

1. `Singleton` - provides the same instance every time it gets asked.
2. `Scoped` - each http request receives a copy of service and shares it within the request.
3. `Prototype` - creates a new service each time it gets provided.
4. `Inherited` - sets `Scoped` if dependency has it, otherwise applies `Singleton`.

`Singleton` cannot depend on `Scoped` services. If you decide

`Inherited` behaviour can be used as default one because it excludes the necessity of manual decision. Just focus on development matter.

e.g. `NumberService` injects `Incrementor` and its behavior is inherited from `Incrementor` which is `Singleton`.

```typescript
import { Inherited } from 'fiorite';
import { Incrementor } from './incrementor';

@Inherited()
export class NumberService {
  constructor(readonly incrementor: Incrementor) {
  }
}
```

---

- Can constructor parameters be manipulated?

Yes, with the help of `Provide` decorator:

- first argument is `ServiceType`
- optionally, second argument, is function which projects new value `(value: T) => R`.

```typescript
import { Provide } from 'fiorite';
import { Incrementor } from './incrementor';

type IncrementFunction = (i: number) => number;

export class NumberService {
  constructor(
    @Provide(Incrementor, incrementor => (i: number) => incrementor.increment(i))
    readonly incrementor: IncrementFunction,
  ) {
  }
}
```

First argument points to service to source from and the second is map function.
It results into `IncrementFunction` as constructor parameter.

---

- How is it possible to reuse complex `Provide` query?

By defining own decorator like this:

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
  ) {
  }
}
```

Unfamiliar `.calledBy()` is the method to point out which decorator uses original one.
Tracking decorator chain, to debug, gets easy:

To access call chain, use:

```typescript
GetIncrementFunction().callStack; // [Provide, GetIncrementFunction]
```

---

- More use cases:

If there is no control over the classes to decorate it:

```typescript
provider.addValue(URL, new URL('http://localhost/'));
```

`addValue` is one of three ways of binding. The others are:

- `addType` - is for class constructors. e.g. `serviceSet.addType(NumberService)`,
- `addFactory` - uses callback to create an instance. Important to set dependencies. e.g.

Also, `add` is one method with multiple overloads which can replace methods listed above.

```typescript
class StringUrlHost {
  constructor(readonly value: string) {
  }
}

const localhost = new StringUrlHost('http://localhost/');

provider.addValue(localhost)
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

- `addMissingDependencies` - walks through service dependencies and adds missing ones.
- `addDecoratedBy` - looks for classes marked by decorator in `DecoratorRecorder` and adds new ones.

```typescript
import { BehaveLike } from 'fiorite';

serviceSet.addDecoratedBy(BehaveLike).addMissingDependencies();
```

`BehaveLike` is base for `Singleton`, `Scoped`, `Prototype` and `Inherited` decorators.
Basically, `addDecoratedBy` scans every class decorated by `BehaveLike` or its implementors and adds to the list.

In case a specific decorator is made with the help of `makeClassDecorator` of `core` component, it, surely, complies with `addDecoratedBy` and can add services automatically.

```text
todo:
[ ] NotSynchronousServiceError add then resolver
[ ] Add service alias (Prototype with dependency on main service)  
```
