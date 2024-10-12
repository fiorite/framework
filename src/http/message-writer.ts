import { HttpMessage } from './message';

export interface HttpMessageWriteContext {
  readonly message: HttpMessage;
  readonly fallback: HttpMessageWriter;
}

export abstract class HttpMessageWriter {
  abstract write(message: HttpMessageWriteContext): void;
}
