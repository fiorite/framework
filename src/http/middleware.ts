import { HttpContext } from './context';
import { VoidCallback } from '../core';
import { HttpCallback } from './callback';
import { HttpPipeline } from './pipeline';

export type HttpMiddleware = (context: HttpContext, next: VoidCallback) => unknown;

export namespace HttpMiddleware {
  export function all(array: Iterable<HttpMiddleware>, fallback: VoidCallback): HttpCallback {
    return new HttpPipeline(array, fallback);
  }
}
