import { HttpHeaders } from './headers';
import { Closeable, CustomStream, ListenableFunction } from '../io';
import { CloseFunction } from '../io/close';

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

export abstract class HttpMessage implements Closeable {
  abstract readonly headers: HttpHeaders<HttpMessageHeader | string>;
  abstract readonly headersSent: boolean;

  get contentLength(): number | undefined {
    const value = this.headers.get(HttpMessageHeader.ContentLength);
    return value ? Number(value) : undefined;
  }

  get contentType(): string | undefined {
    return this.headers.get(HttpMessageHeader.ContentType) as string | undefined; // todo: handle array
  }

  get readable(): boolean {
    return this.body.readable;
  }

  get writable(): boolean {
    return this.body.writable;
  }

  abstract readonly body: CustomStream<Uint8Array>;

  get closed(): boolean {
    return this.body.closed;
  }

  get close(): ListenableFunction<CloseFunction, void> {
    return this.body.close;
  }
}
