import { Observable, of } from 'rxjs';

/** @deprecated please remove */
export class OldResponse extends Observable<Uint8Array> {
  readonly body: Observable<Uint8Array>;

  static json(value: unknown, statusCode = 200, headers: Record<string, string | number | string[]> = {}): OldResponse {
    const jsonString = JSON.stringify(value);

    return new OldResponse(jsonString, statusCode, {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': jsonString.length,
    });
  }

  constructor(
    body: Observable<Uint8Array> | Uint8Array | string,
    readonly statusCode = 200,
    readonly headers: Record<string, string | number | string[]> = {},
  ) {
    let source: Observable<Uint8Array>;
    if (body instanceof Observable) {
      source = body;
    } else if (typeof body === 'string') {
      source = of(new TextEncoder().encode(body));
    } else {
      source = of(body);
    }

    super(subscriber => this.body.subscribe(subscriber));
    this.body = source;
  }
}

export const ok = (body: unknown): OldResponse => {
  return OldResponse.json(body);
};
