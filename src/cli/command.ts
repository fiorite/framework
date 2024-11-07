import { makeMethodDecorator, MethodDecoratorWithPayload } from '../core';

export function CliCommand(name: string): MethodDecoratorWithPayload<string> {
  return makeMethodDecorator(CliCommand, name);
}
