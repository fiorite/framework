import { ServiceDescriptor } from './service-descriptor';
import { ServiceBehavior } from './service-behavior';
import { ServiceType } from './service-type';

type IndexedValue<T> = [T, number];

export function remapBehaviorInheritance(source: Iterable<ServiceDescriptor>): ServiceDescriptor[] {
  const result: ServiceDescriptor[] = Array.from(source);

  let index = 0;
  // iterableMap(x => [x, index++])(source);

  const queue = Array.from(source).map<IndexedValue<ServiceDescriptor>>((x, index) => [x, index])
    .filter(x => ServiceBehavior.Inherited === x[0].behavior);

  while (queue.length) {
    const entry = queue.shift()!;

    const dependencies = entry[0].dependencies.map<IndexedValue<ServiceDescriptor>>(serviceKey => {
      const index = result.findIndex(x => x.type === serviceKey);
      if (index < 0) {
        throw new Error('Missing dependency: ' + ServiceType.toString(serviceKey));
      }
      return [result[index], index];
    });

    const inheritedDeps = dependencies.filter(x => ServiceBehavior.Inherited === x[0].behavior);

    if (inheritedDeps.length) {
      inheritedDeps.forEach(entry2 => { // clean queue
        const index = queue.findIndex(x => x[0].type === entry2[0].type);
        queue.splice(index, 1);
      });

      queue.unshift(...inheritedDeps, entry);  // requeue
    } else {
      const inheritScopebehavior = dependencies.some(entry2 => ServiceBehavior.Scoped === entry2[0].behavior);
      result[entry[1]] = entry[0].inherit(inheritScopebehavior ? ServiceBehavior.Scoped : ServiceBehavior.Singleton);
    }
  }

  return result;
}

function mapDependenciesToDeclarations(collection: readonly ServiceDescriptor[], declaration: ServiceDescriptor): ServiceDescriptor[] {
  return declaration.dependencies.map(serviceKey => {
    const index = collection.findIndex(x => x.type === serviceKey);
    if (index < 0) {
      throw new Error('Missing dependency: ' + ServiceType.toString(serviceKey));
    }
    return collection[index];
  });
}

// todo: optimize algorithm probably
export function validateCircularDependency(source: readonly ServiceDescriptor[]): void {
  const queue1 = source.slice();

  while (queue1.length) {
    const declaration1 = queue1.shift()!;
    const queue2 = mapDependenciesToDeclarations(source, declaration1);

    while (queue2.length) {
      const declaration2 = queue2.shift()!;
      if (declaration2.type === declaration1.type) {
        throw new Error('Circular dependency detected: ' + ServiceType.toString(declaration1.type));
      }
      queue2.unshift(...mapDependenciesToDeclarations(source, declaration2));
    }
  }
}

export function validateBehaviorDependency(source: readonly ServiceDescriptor[]): void {
  const queue = source.slice();
  while (queue.length) {
    const declaration = queue.shift()!;
    const dependencies = mapDependenciesToDeclarations(source, declaration);

    const index1 = dependencies.findIndex(x => ServiceBehavior.Inherited === x.behavior);
    if (index1 > -1) {
      const dependency1 = dependencies[index1];
      throw new Error('Inherit behavior is not resolved: ' + ServiceType.toString(dependency1.type));
    }

    if (ServiceBehavior.Singleton === declaration.behavior) {
      const index2 = dependencies.findIndex(x => ServiceBehavior.Scoped === x.behavior);
      if (index2 > -1) {
        const dependency2 = dependencies[index2];
        throw new Error(`Faulty behavior dependency. Singleton (${ServiceType.toString(declaration.type)}) cannot depend on Scope (${ServiceType.toString(dependency2.type)}) behavior.`);
      }
    }
  }
}
