import { HttpBodyResult, HttpCallback, HttpPipeline } from '../http';
import { FunctionClass } from '../core';
import { ApplicationConfigureFunction } from './application';

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
              context.provide!(HttpBodyResult).complete(json);
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

export function featureJsonParser(): ApplicationConfigureFunction {
  const middleware = new JsonParserMiddleware();
  return provider => {
    provider.addScoped(HttpBodyResult).addValue(JsonParserMiddleware, middleware);
    provider(HttpPipeline).add(middleware);
  };
}
