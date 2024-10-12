import { AbstractType } from '../core';
import { provide } from '../di';
import { EventEmitter } from './emitter';

export function emit(event: string | symbol | number, value: unknown): void;
export function emit<T>(event: AbstractType<T>, value: T): void;
export function emit(event: object): void;
export function emit(...args: unknown[]): void {
  (provide(EventEmitter).emit as Function)(...args);
}
