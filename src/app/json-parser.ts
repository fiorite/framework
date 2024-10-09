import { HttpBodyResult, HttpCallback, HttpPipeline } from '../http';
import { ApplicationFeature } from './feature';
import { FunctionClass } from '../core';
import { ServiceProviderWithReturnFunction, ServiceSet } from '../di';

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

export class JsonParserFeature implements ApplicationFeature {
  private readonly _middleware: JsonParserMiddleware;

  constructor() {
    this._middleware = new JsonParserMiddleware();
  }

  registerServices(serviceSet: ServiceSet) {
    serviceSet.addScoped(HttpBodyResult)
      .addValue(JsonParserMiddleware, this._middleware);
  }

  configure(provide: ServiceProviderWithReturnFunction) {
    provide(HttpPipeline).add(this._middleware);
  }
}

export function addJsonParser(): JsonParserFeature {
  return new JsonParserFeature();
}
