import { FunctionClass } from '../core';
import { HttpCallback } from './callback';
import { HttpBodyResult } from './result';
import { ServiceProvider } from '../di';
import { HttpPipeline } from './pipeline';

export class JsonParserMiddleware extends FunctionClass<HttpCallback> {
  constructor() {
    super((context, next) => {
      const request = context.request;
      const contentType = request.contentType;
      const jsonType = 'application/json';
      if (typeof contentType === 'string' && (jsonType === contentType || contentType.startsWith(jsonType + ';'))) {
        let length = 0;
        const buffer: Uint8Array[] = [];

        const read = () => {
          request.read(chunk => {
            if (undefined === chunk) {
              let offset = 0;
              const binary = buffer.reduce((concat, _chunk) => {
                concat.set(_chunk, offset);
                offset += _chunk.length;
                return concat;
              }, new Uint8Array(length));

              const text = new TextDecoder().decode(binary);
              const json = JSON.parse(text);
              context.provider.get(HttpBodyResult).complete(json);
              next();
            } else {
              length += chunk.length;
              buffer.push(chunk);
              read();
            }
          });
        };

        read();
      } else {
        next();
      }
    });
  }
}

export function addJsonParser(provider: ServiceProvider): void {
  const middleware = new JsonParserMiddleware();
  provider.addScoped(HttpBodyResult).addValue(JsonParserMiddleware, middleware);
  provider(HttpPipeline).add(middleware);
}
