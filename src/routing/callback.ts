import { HttpContext } from '../http';
import { MaybePromise, VoidCallback } from '../core';
import { RouteResult } from './result';

export type RouteCallback = (context: HttpContext, next: VoidCallback) => MaybePromise<RouteResult | unknown>;

