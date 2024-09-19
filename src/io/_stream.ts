import { MapCallback, PredicateCallback, ValueCallback, VoidCallback } from '../core';
import { Predicate } from '@angular/core';

export abstract class Stream<T> {
  abstract readonly closed: boolean;
  abstract some(predicate: Predicate<T>, then: VoidCallback): void;

  // write()

  single(callback: ValueCallback<T>): void {
    let fulfilled = false;
    let value: T;
    this.forEach(_value => {
      if (fulfilled) {
        throw new Error('Stream contains more elements than one');
      }

      fulfilled = true;
      value = _value;
    }, () => {
      if (!fulfilled) {
        throw new Error('Stream contains more elements than one');
      }
      callback(value);
    });
  }

  filter(predicate: PredicateCallback<T>): Stream<T> { // in other words #tap()
    throw new Error('not implemented');
  }

  abstract forEach(callback: ValueCallback<T>, end?: VoidCallback): void;

  limit<R>(number: number): Stream<R> { // in other words #tap()
    throw new Error('not implemented');
  }

  map<R>(callback: MapCallback<T, R>): Stream<R> { // in other words #tap()
    throw new Error('not implemented');
  }

  peak(number: number): Stream<T> { // in other words #tap()
    throw new Error('not implemented');
  }

  // reduce

  skip(number: number): Stream<T> {
    throw new Error('not implemented');
  }

  toArray(callback: ValueCallback<readonly T[]>): void {
    const buffer: T[] = [];
    this.forEach(value => buffer.push(value), () => {
      callback(buffer);
    });
  }

  abstract close(): void;
}
