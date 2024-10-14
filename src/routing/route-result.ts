import { HttpResponse, HttpStatusCode } from '../http';
import { ValueCallback, VoidCallback } from '../core';

export abstract class RouteResult {
  abstract write(response: HttpResponse, next: ValueCallback<unknown> | VoidCallback): void;
}

export class StatusCodeResult<T = unknown> extends RouteResult {
  private readonly _statusCode: HttpStatusCode | number;
  private readonly _value?: T;

  constructor(statusCode: HttpStatusCode | number, value?: T) {
    super();
    this._statusCode = statusCode;
    this._value = value;
  }

  write(response: HttpResponse, next: ValueCallback<unknown | void>) {
    response.statusCode = this._statusCode;
    next(this._value);
  }
}

export class OkResult<T = unknown> extends StatusCodeResult<T> {
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

export class NoContentResult extends StatusCodeResult<void> {
  constructor() {
    super(HttpStatusCode.NoContent);
  }
}

export function noContent(): NoContentResult {
  return new NoContentResult();
}
