import type { ServerResponse } from 'node:http';
import { HttpResponse, HttpResponseHeader } from '../response';
import { HttpHeaders } from '../headers';
import { HttpStatusCode } from '../status-code';
import { VoidCallback } from '../../core';

export class NodeJsServerResponseHeaders implements HttpHeaders<HttpResponseHeader | string> {
  get [Symbol.toStringTag](): string {
    return 'NodeJsServerResponseHeaders';
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

export class NodeJsServerResponse extends HttpResponse {
  private readonly _original: ServerResponse;

  get original(): ServerResponse {
    return this._original;
  }

  private readonly _headers: NodeJsServerResponseHeaders;

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

  constructor(response: ServerResponse) {
    super();
    this._original = response;
    this._headers = new NodeJsServerResponseHeaders(response);
  }

  read(): never {
    throw new Error('Method not implemented.');
  }

  write(buffer: Uint8Array, callback?: VoidCallback | undefined): void {
    this._original.write(buffer, callback); // add 'drain' handler
  }

  on(event: 'close', listener: VoidCallback): void {
    this._original.on(event, listener);
  }

  close(): void {
    this._original.end();
  }
}
