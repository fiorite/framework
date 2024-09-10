# Service Component (DRAFT)

Service component provides with Dependency Injection feature. `emitDecoratorMetadata: true` in `tsconfig.json` file makes possible to have automatic wiring based on emitted types.

## Features

- Different behaviours: 
  - `Singleton` - stores single instance or a service.
  - `Scope` - instance belong to context. e.g. HTTP Request 
  - `Prototype` - provide new instance every time.
  - `Inherit` - inherits behaviour from own dependencies. If service depends on `Scope`, it inherits the same time. Otherwise `Singleton` is applied.
- Few decorators:
  - `@Service()` - class decorator. Marks class as service. 
  - `@Provide(ServiceKey)` - parameter decorator. Substitutes instance in parameters.
-  Whether service or substitute is `Promise<T>`, value from it resolves automatically. NEED EXAMPLE
- Class which constructor does not have arguments, does not need a decorator, including `@Service()`
- Decorated constructor argument makes class decorated. No need to use `@Service()` decorator. 

## Getting started

```typescript
import { makeServiceProvider, OnScopeDestroy } from 'fiorite';

// 0. Add classes to create dependency

class Flower {
  constructor(readonly color: string) {
  }
}

class Garden {
  constructor(
    @Provide()
    readonly flower: Flower
  ) {
  }
}

// 1. Initiate ServiceProvider

const provider = makeServiceProvider([
  new Flower('black'),
  Garden,
]);

// 2. ServiceProvider is FunctionClass<ServiceProvideFunction> and can be invoked.

provider(Garden, garden => { // Garden
  console.log(garden.flower.color); // 'black'
});

// 4. Introduce 1st class outside ServiceProvider and create its instance.

class GardenKeeper {
  constructor(@Provide() readonly garden: Garden) {
  }
}

provider.instantiateType(GardenKeeper, gardenKeeper => {
  console.log(gardenKeeper.garden.flower.color); // still 'black'
});

// 5. Add another outer class and call its object method

class ColorPicker {
  pickColor(@Provide() flower: Flower): string {
    return flower.color;
  }
}

const colorPicker = new ColorPicker();
provider.callObjectMethod(colorPicker, 'pickColor', color => {
  console.log(color); // 'black'
});

// 6. Add Scope experiment: new class is going to

class GardenVisitor implements OnScopeDestroy  {
  readonly visitHour = Math.floor(Math.random() * 23);

  onScopeDestroy() {
    console.log(`Goodbye at ${this.visitHour}!`);
  }
}

class GardenGuide {
  static readonly available: readonly string[] = ['John', 'Mike'];

  constructor(readonly name: string) {
  }
}

const provider2 = makeServiceProvider(configure => { // create another ServiceProvider
  const gardenFactory = (visitor: GardenVisitor): GardenGuide => {
    return new GardenGuide(GardenGuide.available[visitor.visitHour % GardenGuide.available.length]);
  };

  configure.addAnything(provider)
    .addScoped(GardenVisitor)
    .addFactory(GardenGuide, gardenFactory, [GardenVisitor]);
});

// ... handle 1st visit

const visit1 = provider2.createScope();
visit1(GardenGuide, guide => console.log(guide.name)); // Hour = 3, Guide = John
visit1.destroyScope(); // Visitor logs 'Goodbye at 3!'

// ... handle 2nd visit

const visit2 = provider2.createScope();
visit2(GardenGuide, guide => console.log(guide.name)); // Hour = 6, Guide = Mike
visit2.destroyScope(); // Visitor logs 'Goodbye at 6!'
```

### Class decorator `Service()`

Mark class as `Service` (and start using component features to auto-wire or redefine arguments). e.g.

```typescript
@Service()
class Garden {
  constructor(/* ...arguments */) {
  }
}
```

### Parameter decorator `Provide([ServiceKey[, MapCallback]])`

Decorator designed for service substitution in constructor or method parameters.

**`Provide` can substitute single service.** If you need to connect couple several services, consider creating a class.

TypeScript interfaces get removed in runtime, they become `Object`.

Next example shows how to keep interface dependency and substitute implementation:

```typescript
// flower.ts

export interface Flower {
  readonly color: string;
}

export class RedFlower implements Flower {
  readonly color = 'red';
}

// ./garden.ts
import { Flower, RedFlower } from './flower.ts';

class Garden {
  constructor(@Provide(RedFlower) flower: Flower) {
    console.log(flower.color); // 'red'
  }
}
```

#### Add `MapCallback` to project unique value out of service instance.

```typescript
// ./garden.ts
import { Provide } from 'fiorite';
import { Flower, RedFlower } from './flower.ts';

class Garden {
  constructor(@Provide(RedFlower, (x: Flower) => x.color) color: string) {
    console.log(color); // 'red'
  }
}
```

#### Redefine own decorator from `Provide()` and have more use of it.

```typescript
// ./color-of.ts
import { Provide, Type } from 'fiorite';
import { Flower } from './flower';

export const ColorOf = (type: Type<Flower>) => Provide(type, (flower: Flower) => flower.color);

// ./garden.ts
import { GetColor } from './color-of.ts';
import { RedFlower } from './flower';

class Garden {
  constructor(@GetColor(RedFlower) color: string) {
    console.log(color); // 'red'
  }
}

```

#### How to test `Provide()` decorator?

In case you make your own decorator using `Provide`, result include data bound to it.

```typescript
import { ColorOf } from './color-of';
import { Flower, RedFlower } from './flower';

const {referTo, callback} = ColorOf(RedFlower).payload; // { referTo: RedFlower, callback: MapCallback<Flower, string> }
assert(referTo === RedFlower); // true

const flower = {color: 'white'} as Flower;
const result = callback(flower);
assert(result === 'white'); // true
```
