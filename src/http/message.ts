import { HttpHeaders } from './headers';
import { ListenableFunction, ValueCallback, VoidCallback } from '../core';

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum HttpMessageHeader {
  CacheControl = 'cache-control',
  Connection = 'connection',
  ContentEncoding = 'content-encoding',
  ContentLength = 'content-length',
  ContentMD5 = 'content-md5',
  ContentType = 'content-type',
  Date = 'date',
  /** @deprecated according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers */
  Pragma = 'pragma',
}

export abstract class HttpMessage {
  abstract readonly headers: HttpHeaders<HttpMessageHeader | string>;
  abstract readonly headersSent: boolean;

  get contentLength(): number | undefined {
    const value = this.headers.get(HttpMessageHeader.ContentLength);
    return value ? Number(value) : undefined;
  }

  get contentType(): string | undefined {
    return this.headers.get(HttpMessageHeader.ContentType) as string | undefined; // todo: handle array
  }

  abstract read(callback: ValueCallback<Uint8Array | undefined>): void;

  /**
   * @param chunk
   * @param callback called on flush
   */
  abstract write(chunk: Uint8Array | string, callback?: VoidCallback): void;

  abstract on(event: 'close', listener: VoidCallback): void;

  abstract close(): void;
}

export class HttpMessageCloseFunction extends ListenableFunction<VoidCallback, void> {
}
