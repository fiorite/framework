import { HttpContext } from '../http';
import { MaybePromiseLike, VoidCallback } from '../core';
import { RouteResult } from './result';

export type RouteCallback = (context: HttpContext, next: VoidCallback) => MaybePromiseLike<RouteResult | unknown>;

