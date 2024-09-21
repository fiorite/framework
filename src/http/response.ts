import { HttpMessage, HttpMessageHeader } from './message';
import { HttpHeaders } from './headers';
import { HttpStatusCode } from './status-code';

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum HttpResponseHeader {
  AcceptCH = 'accept-ch',
  AccessControlAllowOrigin = 'access-control-allow-origin',
  AccessControlAllowCredentials = 'access-control-allow-credentials',
  AccessControlExposeHeaders = 'access-control-expose-headers',
  AccessControlMaxAge = 'access-control-max-age',
  AccessControlAllowMethods = 'access-control-allow-methods',
  AccessControlAllowHeaders = 'access-control-allow-headers',
  AcceptPatch = 'accept-patch',
  AcceptRanges = 'accept-ranges',
  Age = 'age',
  Allow = 'allow',
  AltSvc = 'alt-svc',
  CacheControl = HttpMessageHeader.CacheControl,
  Connection = HttpMessageHeader.Connection,
  ContentDisposition = 'content-disposition',
  ContentEncoding = HttpMessageHeader.ContentEncoding,
  ContentLanguage = 'content-language',
  ContentLength = HttpMessageHeader.ContentLength,
  ContentMD5 = HttpMessageHeader.ContentMD5,
  ContentRange = 'content-range',
  ContentType = HttpMessageHeader.ContentType,
  Date = HttpMessageHeader.Date,
  ContentLocation = 'content-location',
  DeltaBase = 'delta-base',
  ETag = 'etag',
  Expires = 'expires',
  IM = 'im',
  LastModified = 'last-modified',
  Link = 'link',
  Location = 'location',
  P3P = 'p3p',
  /** @deprecated according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers */
  Pragma = HttpMessageHeader.Pragma,
  PreferenceApplied = 'preference-applied',
  ProxyAuthenticate = 'proxy-authenticate',
  PublicKeyPins = 'public-key-pins',
  RetryAfter = 'retry-after',
  Server = 'server',
  SetCookie = 'set-cookie',
  StrictTransportSecurity = 'strict-transport-security',
  Trailer = 'trailer',
  TransferEncoding = 'transfer-encoding',
  Tk = 'tk',
  Upgrade = 'upgrade',
  Vary = 'vary',
  Via = 'via',
  Warning = 'warning',
  WWWAuthenticate = 'www-authenticate',
  XFrameOptions = 'x-frame-options',
  // non-standard ones from wiki above
  ContentSecurityPolicy = 'content-security-policy',
  XContentSecurityPolicy = 'x-content-security-policy',
  XWebKitCSP = 'x-webkit-csp',
  ExpectCT = 'expect-ct',
  NEL = 'nel',
  PermissionsPolicy = 'permissions-policy',
  Refresh = 'refresh',
  ReportTo = 'report-to',
  Status = 'status',
}

export abstract class HttpResponse extends HttpMessage {
  abstract statusCode: HttpStatusCode | number;
  abstract override headers: HttpHeaders<HttpResponseHeader | string>;
}

