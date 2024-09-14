import { AbstractType, Type } from '../core';

export type ServiceType<T = unknown> = Type<T> | AbstractType<T> | Symbol | string;

export namespace ServiceType {
  export function toString(key: ServiceType): string {
    const typeOf = typeof key;

    if ('string' === typeOf) {
      return key as string;
    }

    if ('symbol' === typeOf) {
      return (key as symbol).toString();
    }

    return (key as AbstractType).name;
  }
}

