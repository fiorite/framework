import { Type } from '../type';
import 'reflect-metadata';
import { DecoratorRecorder } from '../decorator';
import { BehaveLike } from '../../di';

export function reflectTargetTypes(type: Type, propertyKey?: string | symbol): Type[] {
  const length = (propertyKey ? type.prototype[propertyKey] : type).length;

  if (!length) {
    return [];
  }

  const types = propertyKey ?
    Reflect.getMetadata('design:paramtypes', type.prototype, propertyKey) :
    Reflect.getMetadata('design:paramtypes', type);

  if (undefined === types) {
    console.log(DecoratorRecorder.classSearch(BehaveLike, type));
    throw new Error('Target is not decorated: '+type.name+(propertyKey ? '#'+propertyKey.toString()+'(...))' : '#constructor(...)'));
  }

  return types;
}
