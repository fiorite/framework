import { HttpStatusCode } from '../http';

export abstract class RouteResult<T = unknown> {
  private readonly _statusCode?: number;

  get statusCode(): number | undefined {
    return this._statusCode;
  }

  private readonly _headers?: Record<string, string>;

  get headers(): Record<string, string> | undefined {
    return this._headers;
  }

  private readonly _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  protected constructor(value?: T, statusCode?: number, headers?: Record<string, string>) {
    this._statusCode = statusCode;
    this._value = value;
    this._headers = headers ? { ...headers } : undefined;
  }
}

export class StatusCodeResult<T = unknown> extends RouteResult<T> {
  constructor(statusCode: number, value?: T) {
    super(value, statusCode);
  }
}

export class OkResult<T = unknown> extends RouteResult<T> {
  constructor(value: T) {
    const statusCode = undefined === value ? HttpStatusCode.NoContent : HttpStatusCode.OK;
    super(value, statusCode);
  }
}

export function ok(): OkResult<void>;
export function ok<T>(value: T): OkResult<T>;
export function ok(value?: unknown): OkResult {
  return new OkResult(value);
}

export class NoContentResult extends RouteResult<void> {
  constructor() {
    super(undefined, HttpStatusCode.NoContent);
  }
}

export function noContent(): NoContentResult {
  return new NoContentResult();
}
