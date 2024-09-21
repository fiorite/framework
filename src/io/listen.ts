import { AnyCallback, VoidCallback } from '../core';
import { Closeable } from './close';

export interface Listenable<TCallback extends AnyCallback = VoidCallback> {
  listen(callback: TCallback): Closeable;
}
