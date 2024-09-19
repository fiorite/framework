/** @source https://en.wikipedia.org/wiki/List_of_HTTP_status_codes */
enum InformationalResponseStatusCode {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
}

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_status_codes */
enum SuccessStatusCode {
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  IMUsed = 226,
}

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_status_codes */
enum RedirectionStatusCode {
  MultipleChoices = 300,
  MovedPermanently = 301,
  /** @deprecated currently {@link Found}. */
  MovedTemporarily = 302,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  SwitchProxy = 306,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
}

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_status_codes */
enum ClientErrorStatusCode {
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  URITooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  /** @deprecated IETF April Fools' jokes, in RFC 2324 */
  IMATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableContent = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
}

/** @source https://en.wikipedia.org/wiki/List_of_HTTP_status_codes */
enum ServerErrorStatusCode {
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

export type StatusCode = InformationalResponseStatusCode |
  SuccessStatusCode |
  RedirectionStatusCode |
  ClientErrorStatusCode |
  ServerErrorStatusCode;

export const StatusCode = {
  ...InformationalResponseStatusCode,
  ...SuccessStatusCode,
  ...RedirectionStatusCode,
  ...ClientErrorStatusCode,
  ...ServerErrorStatusCode,
};
