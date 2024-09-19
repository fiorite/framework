import { HttpHeaders, HttpRequestHeader } from '../headers';
import { IncomingMessage } from 'http';

export class NodeRequestHeaders implements HttpHeaders<HttpRequestHeader | string> {
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
