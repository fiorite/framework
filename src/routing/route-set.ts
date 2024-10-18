import { DecoratorOuterFunction, DecoratorRecorder, isType, SetWithInnerKey, Type, VoidCallback } from '../core';
import { RouteDescriptor } from './route-descriptor';
import { iterableForEach } from '../iterable';
import { HttpMethod } from '../http';
import { EventEmitter } from '../events';
import { ReflectedAction, RouteActionFunction } from './route-action';

export class RouteSet extends SetWithInnerKey<RouteDescriptor, string> {
  private readonly _changeEmitter = new EventEmitter<{ change: void }>();

  constructor(descriptors: Iterable<RouteDescriptor>, onChange?: VoidCallback) {
    const routeToString = (route: RouteDescriptor) => route.toString();
    super(routeToString);
    iterableForEach<RouteDescriptor>(route => super.add(route))(descriptors);
    if (onChange) {
      this._changeEmitter.on('change', onChange);
    }
  }

  replace(value: RouteDescriptor): this {
    if (this.has(value)) {
      this._innerMap.set(value.toString(), value);
    } else {
      super.add(value);
    }

    this._changeEmitter.emit('change', void 0);
    return this;
  }

  override add(path: string, action: RouteActionFunction): this;
  override add(httpMethod: HttpMethod | string, path: string, action: RouteActionFunction): this;
  override add(value: RouteDescriptor): this;
  /**
   * @deprecated experimental
   */
  override add(...types: Type[]): this;
  override add(...args: unknown[]): this {
    if (args.length === 1 && args[0] instanceof RouteDescriptor) {
      const value = args[0] as RouteDescriptor;
      if (this.has(value)) {
        throw new Error('route "' + value.toString() + '" is already added.');
      }

      super.add(value);
      this._changeEmitter.emit('change', void 0);
      return this;
    }

    if (isType(args[0])) {
      for (const type of args) {
        for (const route of ReflectedAction.forType(type as Type)) {
          this.add(route);
        }
      }
      return this;
    }

    if (args.length === 2) {
      const [path, callback] = args as [string, RouteActionFunction];
      const route = new RouteDescriptor(path, callback);
      return this.add(route);
    }

    if (args.length === 3) {
      const [httpMethod, path, action] = args as [HttpMethod | string, string, RouteActionFunction];
      const route = new RouteDescriptor(path, action, httpMethod);
      return this.add(route);
    }

    throw new Error('wrong number of args. see overloads.');
  }

  override clear(): void {
    super.clear();
    this._changeEmitter.emit('change', void 0);
  }

  override delete(value: RouteDescriptor): boolean {
    if (super.delete(value)) {
      this._changeEmitter.emit('change', void 0);
      return true;
    }

    return false;
  }

  addDecoratedBy(...decorators: DecoratorOuterFunction<MethodDecorator>[]): this {
    // todo: refactor since corners been cut
    const types = decorators.flatMap(decorator => DecoratorRecorder.methodSearch(decorator).map(x => x.path[0] as Type))
      .reduce((result, current) => {
        if (!result.includes(current)) {
          result.push(current);
        }
        return result;
      }, [] as Function[]);
    for (const type of types) {
      for (const route of ReflectedAction.forType(type as Type)) {
        this.replace(route);
      }
    }
    return this;
  }
}
