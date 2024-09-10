import { ServiceDeclaration } from './declaration';
import { ServiceBehaviour } from './behaviour';
import { ServiceKey } from './key';

type IndexedValue<T> = [T, number];

export function remapBehaviourInheritance(source: readonly ServiceDeclaration[]): readonly ServiceDeclaration[] {
  const result: ServiceDeclaration[] = source.slice();

  const queue = source.map<IndexedValue<ServiceDeclaration>>((x, index) => [x, index])
    .filter(x => ServiceBehaviour.Inherit === x[0].behaviour);

  while (queue.length) {
    const entry = queue.shift()!;

    const dependencies = entry[0].dependencies.map<IndexedValue<ServiceDeclaration>>(serviceKey => {
      const index = result.findIndex(x => x.serviceKey === serviceKey);
      if (index < 0) {
        throw new Error('Missing dependency: '+ServiceKey.toString(serviceKey));
      }
      return [result[index], index];
    });

    const inheritedDeps = dependencies.filter(x => ServiceBehaviour.Inherit === x[0].behaviour);

    if (inheritedDeps.length) {
      inheritedDeps.forEach(entry2 => { // clean queue
        const index = queue.findIndex(x => x[0].serviceKey === entry2[0].serviceKey);
        queue.splice(index, 1);
      });

      queue.unshift(...inheritedDeps, entry);  // requeue
    } else {
      const inheritScopeBehaviour = dependencies.some(entry2 => ServiceBehaviour.Scoped === entry2[0].behaviour);
      result[entry[1]] = entry[0].inheritBehaviour(inheritScopeBehaviour ? ServiceBehaviour.Scoped : ServiceBehaviour.Singleton);
    }
  }

  return result;
}

function mapDependenciesToDeclarations(collection: readonly ServiceDeclaration[], declaration: ServiceDeclaration): ServiceDeclaration[] {
  return declaration.dependencies.map(serviceKey => {
    const index = collection.findIndex(x => x.serviceKey === serviceKey);
    if (index < 0) {
      throw new Error('Missing dependency: '+ServiceKey.toString(serviceKey));
    }
    return collection[index];
  })
}

// todo: optimize algorithm probably
export function validateCircularDependency(source: readonly ServiceDeclaration[]): void {
  const queue1 = source.slice();

  while (queue1.length) {
    const declaration1 = queue1.shift()!;
    const queue2 = mapDependenciesToDeclarations(source, declaration1);

    while (queue2.length) {
      const declaration2 = queue2.shift()!;
      if (declaration2.serviceKey === declaration1.serviceKey) {
        throw new Error('Circular dependency detected: '+ServiceKey.toString(declaration1.serviceKey));
      }
      queue2.unshift(...mapDependenciesToDeclarations(source, declaration2));
    }
  }
}

export function validateBehaviourDependency(source: readonly ServiceDeclaration[]): void {
  const queue = source.slice();
  while (queue.length) {
    const declaration = queue.shift()!;
    const dependencies = mapDependenciesToDeclarations(source, declaration);

    const index1 = dependencies.findIndex(x => ServiceBehaviour.Inherit === x.behaviour);
    if (index1 > -1) {
      const dependency1 = dependencies[index1];
      throw new Error('Inherit behaviour is not resolved: '+ServiceKey.toString(dependency1.serviceKey));
    }

    if (ServiceBehaviour.Singleton === declaration.behaviour) {
      const index2 = dependencies.findIndex(x => ServiceBehaviour.Scoped === x.behaviour);
      if (index2 > -1) {
        const dependency2 = dependencies[index2];
        throw new Error(`Faulty behaviour dependency. Singleton (${ServiceKey.toString(declaration.serviceKey)}) cannot depend on Scope (${ServiceKey.toString(dependency2.serviceKey)}) behaviour.`);
      }
    }
  }
}
