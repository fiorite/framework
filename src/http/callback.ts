import { HttpContext } from './context';
import { VoidCallback } from '../core';
import { HttpPipeline } from './pipeline';

export type HttpCallback = (context: HttpContext, next: VoidCallback) => void;

export namespace HttpCallback {
  export function all(array: Iterable<HttpCallback>, fallback: VoidCallback): HttpCallback {
    return new HttpPipeline(array, fallback);
  }
}
