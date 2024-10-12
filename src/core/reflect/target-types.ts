import { Type } from '../type';
import 'reflect-metadata';

export function reflectTargetTypes(type: Type, propertyKey?: string | symbol): Type[] {
  const types = propertyKey ?
    Reflect.getMetadata('design:paramtypes', type.prototype, propertyKey) :
    Reflect.getMetadata('design:paramtypes', type);

  if (undefined === types) {
    throw new Error('Target is not decorated by anything: '+type.name+(propertyKey ? '#'+propertyKey.toString()+'(...))' : 'constructor(...)'));
  }

  return types;
}
