/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum HttpHeader {
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

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum RequestStandardHeader {
  AIM = 'a-im',
  Accept = 'accept',
  AcceptCharset = 'accept-charset',
  AcceptDatetime = 'accept-datetime',
  AcceptEncoding = 'accept-encoding',
  AcceptLanguage = 'accept-language',
  AccessControlRequestMethod = 'access-control-request-method',
  AccessControlRequestHeaders = 'access-control-request-headers',
  Authorization = 'authorization',
  Cookie = 'cookie',
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

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum RequestNonStandardHeader {
  UpgradeInsecureRequests = 'upgrade-insecure-requests',
  XRequestedWith = 'x-requested-with',
  DNT = 'x-requested-with',
  XForwardedFor = 'x-forwarded-for',
  XForwardedHost = 'x-forwarded-host',
  XForwardedProto = 'x-forwarded-proto', // todo: use in url.
  FrontEndHttps = 'front-end-https',
  XHttpMethodOverride = 'x-http-method-override', // todo: add impl.
  XATTDeviceId = 'x-att-deviceid',
  XWapProfile = 'x-wap-profile',
  ProxyConnection = 'proxy-connection',
  XUIDH = 'x-uidh',
  XCsrfToken = 'x-csrf-token',
  XRequestID = 'x-request-id',
  XCorrelationID = 'x-correlation-id',
  CorrelationID = 'correlation-id',
  SaveData = 'save-data',
  SecGPC = 'sec-gpc',
}

export type HttpRequestHeader = HttpHeader | RequestStandardHeader | RequestNonStandardHeader;

export const HttpRequestHeader = {...HttpHeader, ...RequestStandardHeader, ...RequestNonStandardHeader};

// https://en.wikipedia.org/wiki/List_of_HTTP_header_fields
export enum ResponseStandardHeader {
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
  ContentDisposition = 'content-disposition',
  ContentLanguage = 'content-language',
  ContentLocation = 'content-location',
  ContentRange = 'content-range',
  DeltaBase = 'delta-base',
  ETag = 'etag',
  Expires = 'expires',
  IM = 'im',
  LastModified = 'last-modified',
  Link = 'link',
  Location = 'location',
  P3P = 'p3p',
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
}

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_header_fields */
export enum ResponseNonStandardHeader {
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

export type ResponseHeader = HttpHeader | ResponseStandardHeader | ResponseNonStandardHeader;

export const ResponseHeader = {...HttpHeader, ...ResponseStandardHeader, ...ResponseNonStandardHeader};

export interface HttpHeaders<T extends string = string> extends Map<T, number | string | string[] | undefined> {
  append(name: string, value: string | readonly string[]): this;
}
