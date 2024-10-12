import { AbstractType, makeMethodDecorator, MaybePromiseLike, MethodDecoratorWithPayload } from '../core';

type EventName<T> = string | symbol | number | AbstractType<T>;
type OnMethod<T> = (event: T, ...args: unknown[]) => MaybePromiseLike<void>;

/**
 * - Class method which get decorated cannot be Scoped service. Either Prototype or Singleton.
 * - Method might contain one parameter which is not part of provider. Add check of literal object and empty interfaces to
 * - Unlisted service is Prototype,
 * @constructor
 */
export const OnEvent = <T>(event: EventName<T>): MethodDecoratorWithPayload<EventName<T>, OnMethod<T>> => {
  return makeMethodDecorator<EventName<T>, OnMethod<T>>(OnEvent, event);
};
