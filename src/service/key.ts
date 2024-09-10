import { AbstractType, Type } from '../core';

export type ServiceKey<T = unknown> = Type<T> | AbstractType<T> | Symbol | string;

export namespace ServiceKey {
  export function toString(key: ServiceKey): string {
    const typeofKey = typeof key;

    if ('string' === typeofKey) {
      return key as string;
    }

    if ('symbol' === typeofKey) {
      return (key as symbol).toString();
    }

    return (key as AbstractType).name;
  }
}

