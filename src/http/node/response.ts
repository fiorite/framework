import { ServerResponse } from 'node:http';
import { HttpResponse } from '../response';
import { HttpHeaders, ResponseHeader } from '../headers';
import { NodeResponseHeaders } from './response-headers';
import { StatusCode } from '../status-code';
import { Stream } from '../../io';

export class NodeResponse extends HttpResponse {
  private _response: ServerResponse;

  get response(): ServerResponse {
    return this._response;
  }

  private readonly _headers: NodeResponseHeaders;

  override get headers(): HttpHeaders<ResponseHeader | string> {
    return this._headers;
  }

  override get headersSent(): boolean {
    return this._response.headersSent;
  }

  override get statusCode(): StatusCode | number {
    return this._response.statusCode;
  }

  override set statusCode(value: StatusCode | number) {
    this._response.statusCode = value;
  }

  private readonly _body: Stream<Uint8Array>;

  override get body(): Stream<Uint8Array> {
    return this._body;
  }

  constructor(response: ServerResponse) {
    super();
    this._response = response;
    this._headers = new NodeResponseHeaders(response);
    this._body = new Stream({
      writer: value => response.write(value),
      close: () => response.end(),
    });
    response.on('close', () => this._body.close());
  }
}
