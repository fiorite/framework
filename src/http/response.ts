import { HttpMessage } from './message';
import { HttpHeaders, ResponseHeader } from './headers';
import { StatusCode } from './status-code';

export abstract class HttpResponse extends HttpMessage {
  static readonly Header = ResponseHeader;
  abstract statusCode: StatusCode | number;
  abstract override headers: HttpHeaders<ResponseHeader | string>;
}

// export class JsonResponse extends  {
// }
