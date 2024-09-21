import type { ServerResponse } from 'node:http';
import { HttpResponse, HttpResponseHeader } from '../response';
import { HttpHeaders } from '../headers';
import { HttpStatusCode } from '../status-code';
import { Stream } from '../../io';

export class NodeResponseHeaders implements HttpHeaders<HttpResponseHeader | string> {
  get [Symbol.toStringTag](): string {
    return 'NodeResponseHeaders';
  }

  private _response: ServerResponse;

  constructor(response: ServerResponse) {
    this._response = response;
  }

  clear(): void {
    this._response.getHeaderNames().forEach(headerName => this._response.removeHeader(headerName));
  }

  delete(key: string): boolean {
    if (this._response.hasHeader(key)) {
      this._response.removeHeader(key);
      return true;
    }
    return false;
  }

  forEach(callbackfn: (value: string | number | string[] | undefined, key: string, map: Map<string, string | number | string[] | undefined>) => void): void {
    Object.entries(this._response.getHeaders()).forEach((entry) => callbackfn(entry[1], entry[0], this));
  }

  get(key: string): string | number | string[] | undefined {
    return this._response.getHeader(key);
  }

  has(key: string): boolean {
    return this._response.hasHeader(key);
  }

  set(key: string, value: string | number | string[]): this {
    this._response.setHeader(key, value);
    return this;
  }

  get size(): number {
    return this._response.getHeaderNames().length;
  }

  entries(): IterableIterator<[string, string | number | string[] | undefined]> {
    return Object.entries(this._response.getHeaders())[Symbol.iterator]();
  }

  keys(): IterableIterator<string> {
    return this._response.getHeaderNames()[Symbol.iterator]();
  }

  values(): IterableIterator<string | number | string[] | undefined> {
    return Object.values(this._response.getHeaders())[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, number | string | string[] | undefined]> {
    return Object.entries(this._response.getHeaders())[Symbol.iterator]();
  }

  append(name: string, value: string | readonly string[]): this {
    this._response.appendHeader(name, value);
    return this;
  }
}

export class NodeResponse extends HttpResponse {
  private readonly _original: ServerResponse;

  get original(): ServerResponse {
    return this._original;
  }

  private readonly _headers: NodeResponseHeaders;

  override get headers(): HttpHeaders<HttpResponseHeader | string> {
    return this._headers;
  }

  override get headersSent(): boolean {
    return this._original.headersSent;
  }

  override get statusCode(): HttpStatusCode | number {
    return this._original.statusCode;
  }

  override set statusCode(value: HttpStatusCode | number) {
    this._original.statusCode = value;
  }

  private readonly _body: Stream<Uint8Array>;

  override get body(): Stream<Uint8Array> {
    return this._body;
  }

  constructor(response: ServerResponse) {
    super();
    this._original = response;
    this._headers = new NodeResponseHeaders(response);
    this._body = new Stream({
      writer: value => response.write(value),
      close: () => response.end(),
    });
    response.on('close', () => this._body.close());
  }
}
