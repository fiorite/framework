import { HttpContext } from '../http';
import { MaybePromiseLike, ValueCallback, VoidCallback } from '../core';
import { RouteResult } from './result';

export type RouteCallback = (context: HttpContext, next: ValueCallback<unknown>) => MaybePromiseLike<RouteResult | unknown>;
