import { HttpContext, HttpStatusCode } from '../http';
import { MaybePromise, VoidCallback } from '../core';

export type RouteCallback = (context: HttpContext, next: VoidCallback) => MaybePromise<RouteCallbackResult | unknown>;

export abstract class RouteCallbackResult<T = unknown> {
  private readonly _statusCode?: number;

  get statusCode(): number | undefined {
    return this._statusCode;
  }

  private readonly _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  protected constructor(statusCode?: number, value?: T) {
    this._statusCode = statusCode;
    this._value = value;
  }
}

export class StatusCodeResult<T = unknown> extends RouteCallbackResult<T> {
  constructor(statusCode: number, value?: T) {
    super(statusCode, value);
  }
}

export class OkResult<T = unknown> extends RouteCallbackResult<T> {
  constructor(value: T) {
    const statusCode = undefined === value ? HttpStatusCode.NoContent : HttpStatusCode.OK;
    super(statusCode, value);
  }
}

export function ok(): OkResult<void>;
export function ok<T>(value: T): OkResult<T>;
export function ok(value?: unknown): OkResult {
  return new OkResult(value);
}

export class NoContentResult extends RouteCallbackResult<void> {
  constructor() {
    super(HttpStatusCode.NoContent);
  }
}

export function noContent(): NoContentResult {
  return new NoContentResult();
}
