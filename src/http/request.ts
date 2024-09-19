import { HttpMessage } from './message';
import { HttpHeaders, HttpRequestHeader } from './headers';
import { HttpMethod } from './method';

export abstract class HttpRequest extends HttpMessage {
  static readonly Header = HttpRequestHeader;
  abstract method: HttpMethod | string | undefined;
  abstract url: URL | undefined;
  abstract readonly query: Map<string, string>;
  /** @deprecated will be somewhere else i believe */
  abstract readonly params: Map<string, string | number | boolean>;
  abstract override readonly headers: HttpHeaders<HttpRequestHeader | string>;
}
