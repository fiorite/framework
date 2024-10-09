import { HttpContext } from '../http';
import { MaybePromiseLike, ValueCallback } from '../core';
import { RouteResult } from './result';

export type RouteCallback = (context: HttpContext, next: ValueCallback<unknown>) => MaybePromiseLike<RouteResult | unknown>;
