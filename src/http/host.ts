import { IncomingMessage } from 'http';
import { ServerResponse } from 'node:http';

export class RequestListenerHost {
  request?: IncomingMessage;
  response?: ServerResponse;
}
