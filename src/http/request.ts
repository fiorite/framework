import { HttpMessage, HttpMessageHeader } from './message';
import { HttpHeaders } from './headers';
import { HttpMethod } from './method';

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum HttpRequestHeader {
  AIM = 'a-im',
  Accept = 'accept',
  AcceptCharset = 'accept-charset',
  AcceptDatetime = 'accept-datetime',
  AcceptEncoding = 'accept-encoding',
  AcceptLanguage = 'accept-language',
  AccessControlRequestMethod = 'access-control-request-method',
  AccessControlRequestHeaders = 'access-control-request-headers',
  Authorization = 'authorization',
  CacheControl = HttpMessageHeader.CacheControl,
  Connection = HttpMessageHeader.Connection,
  ContentEncoding = HttpMessageHeader.ContentEncoding,
  ContentLength = HttpMessageHeader.ContentLength,
  ContentMD5 = HttpMessageHeader.ContentMD5,
  Cookie = 'cookie',
  Date = HttpMessageHeader.Date,
  Expect = 'expect',
  Forwarded = 'forwarded',
  From = 'from',
  Host = 'host',
  HTTP2Settings = 'http2-settings',
  IfMatch = 'if-match',
  IfModifiedSince = 'if-modified-since',
  IfNoneMatch = 'if-none-match',
  IfRange = 'if-range',
  IfUnmodifiedSince = 'if-unmodified-since',
  MaxForwards = 'max-forwards',
  Origin = 'origin',
  /** @deprecated according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers */
  Pragma = HttpMessageHeader.Pragma,
  Prefer = 'prefer',
  ProxyAuthorization = 'proxy-authorization',
  Range = 'range',
  Referer = 'referer',
  TE = 'te',
  Trailer = 'trailer',
  TransferEncoding = 'transfer-encoding',
  UserAgent = 'user-agent',
  Upgrade = 'upgrade',
  Via = 'via',
  /** @deprecated according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers */
  Warning = 'warning',
}

export abstract class HttpRequest extends HttpMessage {
  abstract method: HttpMethod | string | undefined;
  abstract url: URL | undefined;
  abstract readonly query: Map<string, string>;
  /** @deprecated will be somewhere else i believe */
  abstract readonly params: Map<string, string | number | boolean>;
  abstract override readonly headers: HttpHeaders<HttpRequestHeader | string>;
}
