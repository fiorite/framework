import { AbstractType, Type } from '../core';

export type ServiceType<T = unknown> = Type<T> | AbstractType<T> | Symbol | string;

export namespace ServiceType {
  export function toString(object: ServiceType): string {
    const type = typeof object;

    if ('string' === type) {
      return '"'+object as string+'"';
    }

    if ('symbol' === type) {
      return 'Symbol('+(object as symbol).toString()+')';
    }

    return (object as AbstractType).name;
  }
}
