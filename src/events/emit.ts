import { AbstractType } from '../core';
import { provide } from '../di';
import { EventEmitter } from './emitter';

export function emit(event: string | symbol | number, value: unknown): boolean;
export function emit<T>(event: AbstractType<T>, value: T): boolean;
export function emit(event: object): boolean;
export function emit(...args: unknown[]): boolean {
  return (provide(EventEmitter).emit as Function)(...args);
}
