import { HttpRequest } from '../request';
import { HttpHeaders, ResponseHeader } from '../headers';
import { NodeRequestHeaders } from './request-headers';
import { Stream } from '../../io';
import { IncomingMessage } from 'http';
import { HttpMethod } from '../method';
import { URL } from 'node:url';

export class NodeRequest extends HttpRequest {
  private readonly _request: IncomingMessage;

  get request(): IncomingMessage {
    return this._request;
  }

  override get method(): HttpMethod | string | undefined {
    return this._request.method;
  }

  override set method(value: HttpMethod | string | undefined) {
    this._request.method = value;
  }

  private _url?: URL;

  override get url(): URL | undefined {
    return this._url;
  }

  override set url(value: URL | undefined) {
    this._url = value;
  }

  private readonly _query: Map<string, string>;

  override get query(): Map<string, string> {
    return this._query;
  }

  private readonly _params: Map<string, string | number | boolean>;

  override get params(): Map<string, string | number | boolean> {
    return this._params;
  }

  private readonly _headers: NodeRequestHeaders;

  override get headers(): HttpHeaders<ResponseHeader | string> {
    return this._headers;
  }

  override get headersSent(): boolean {
    return true;
  }

  private readonly _body: Stream<Uint8Array>;

  override get body(): Stream<Uint8Array> {
    return this._body;
  }

  constructor(request: IncomingMessage) {
    super();
    this._request = request;
    this._url = new URL(request.url!, 'http://localhost');
    this._query = new Map(this._url.searchParams); // todo: fix
    this._params = new Map(); // todo: parse params
    this._headers = new NodeRequestHeaders(request);
    this._body = new Stream({
      reader: callback => callback(request.read()),
      close: () => request.destroy(),
    });
    request.on('close', () => this._body.close());
  }
}
