import { ClassDecoratorWithPayload, makeClassDecorator } from '../core';

export function CliPrefix(prefix: string): ClassDecoratorWithPayload<string> {
  return makeClassDecorator(CliPrefix, prefix);
}
