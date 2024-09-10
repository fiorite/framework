import { Observable, of } from 'rxjs';

export class Response extends Observable<Uint8Array> {
  readonly body: Observable<Uint8Array>;

  static json(value: unknown, statusCode = 200, headers: Record<string, string | number | string[]> = {}): Response {
    const jsonString = JSON.stringify(value);

    return new Response(jsonString, statusCode, {
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

