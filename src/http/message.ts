import { HttpHeader, HttpHeaders } from './headers';
import { Stream } from '../io';

export abstract class HttpMessage {
  abstract readonly headers: HttpHeaders;
  abstract readonly headersSent: boolean;

  get contentLength(): number | undefined {
    const header = this.headers.get(HttpHeader.ContentLength);
    return header ? Number(header) : undefined;
  }

  get contentType(): string {
    return this.headers.get(HttpHeader.ContentType) as string;
  }

  abstract readonly body: Stream<Uint8Array>;
}
