import { HttpParams, HttpQuery, HttpRequest, HttpRequestHeader } from '../request';
import { HttpHeaders } from '../headers';
import type { IncomingMessage } from 'http';
import { HttpMethod } from '../method';
import { URL } from 'node:url';
import { ListenableFunction, ValueCallback, VoidCallback } from '../../core';

export class NodeServerRequestHeaders implements HttpHeaders<HttpRequestHeader | string> {
  get [Symbol.toStringTag](): string {
    return 'NodeRequestHeaders';
  }

  private _request: IncomingMessage;

  constructor(request: IncomingMessage) {
    this._request = request;
  }

  clear(): void {
    this._request.headers = {};
  }

  delete(key: string): boolean {
    if (key in this._request.headers) {
      delete this._request.headers[key];
      return true;
    }
    return false;
  }

  forEach(callbackfn: (value: string | number | string[] | undefined, key: string, map: Map<string, string | number | string[] | undefined>) => void): void {
    Object.entries(this._request.headers).forEach((entry) => callbackfn(entry[1], entry[0], this));
  }

  get(key: string): string | number | string[] | undefined {
    return this._request.headers[key];
  }

  has(key: string): boolean {
    return key in this._request.headers;
  }

  set(key: string, value: string | number | string[]): this {
    (this._request.headers as any)[key] = value;
    return this;
  }

  get size(): number {
    return Object.keys(this._request.headers).length;
  }

  entries(): IterableIterator<[string, string | number | string[] | undefined]> {
    return Object.entries(this._request.headers)[Symbol.iterator]();
  }

  keys(): IterableIterator<string> {
    return Object.keys(this._request.headers)[Symbol.iterator]();
  }

  values(): IterableIterator<string | number | string[] | undefined> {
    return Object.values(this._request.headers)[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, number | string | string[] | undefined]> {
    return Object.entries(this._request.headers)[Symbol.iterator]();
  }

  append(name: string, value: string | readonly string[]): this {
    const prev = this._request.headers[name];
    const array = Array.isArray(prev) ? prev : (
      undefined === prev ? [prev] : prev
    );
    this._request.headers[name] = [...array, ...(Array.isArray(value) ? value : [value])];
    return this;
  }
}

export class NodeServerRequest extends HttpRequest {
  private readonly _original: IncomingMessage;

  get original(): IncomingMessage {
    return this._original;
  }

  override get method(): HttpMethod | string | undefined {
    return this._original.method;
  }

  override set method(value: HttpMethod | string | undefined) {
    this._original.method = value;
  }

  private _url?: URL;

  override get url(): URL | undefined {
    return this._url;
  }

  override set url(value: URL | undefined) {
    this._url = value;
  }

  private readonly _query: HttpQuery;

  override get query(): HttpQuery {
    return this._query;
  }

  private readonly _params: HttpParams;

  override get params(): HttpParams {
    return this._params;
  }

  private readonly _headers: NodeServerRequestHeaders;

  override get headers(): HttpHeaders<HttpRequestHeader | string> {
    return this._headers;
  }

  override get headersSent(): boolean {
    return true;
  }

  private readonly _close: ListenableFunction<VoidCallback, void>;

  override get close(): ListenableFunction<VoidCallback, void> {
    return this._close;
  }

  private _readable = false;

  constructor(request: IncomingMessage) {
    super();
    this._original = request;
    this._url = new URL(request.url!, 'http://localhost');
    this._query = new HttpQuery(this._url.searchParams); // todo: fix
    this._params = new HttpParams(); // todo: parse params
    this._headers = new NodeServerRequestHeaders(request);
    this._close = new ListenableFunction<VoidCallback, void>(() => request.destroy());
    request.on('close', () => this._close.emit());
  }

  override read(callback: ValueCallback<Uint8Array | undefined>): void {
    const read = () => {
      const chunk = this._original.read();
      callback(null === chunk ? undefined : chunk);
    };

    this._original.once('readable', read);
  }

  override write(): never {
    throw new Error('Method not implemented.');
  }
}
