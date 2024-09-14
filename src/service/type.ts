import { AbstractType, Type } from '../core';

export type ServiceType<T = unknown> = Type<T> | AbstractType<T> | Symbol | string;

export namespace ServiceType {
  export function toString(key: ServiceType): string {
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

