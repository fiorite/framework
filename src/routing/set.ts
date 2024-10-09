import { DecoratorOuterFunction, DecoratorRecorder, isType, SetWithInnerKey, Type, VoidCallback } from '../core';
import { RouteDescriptor } from './route-descriptor';
import { iterableForEach } from '../iterable';
import { EventEmitter } from '../core/event-emitter';
import { RouteCallback } from './callback';
import { HttpMethod } from '../http';
import { TypeRoutes } from './route';

export class RouteSet extends SetWithInnerKey<RouteDescriptor, string> {
  private readonly _changeEmitter = new EventEmitter();

  constructor(descriptors: Iterable<RouteDescriptor>, onChange?: VoidCallback) {
    const routeToString = (route: RouteDescriptor) => route.toString();
    super(routeToString);
    iterableForEach<RouteDescriptor>(route => super.add(route))(descriptors);
    if (onChange) {
      this._changeEmitter.on('change', onChange);
    }
  }

  override add(path: string, callback: RouteCallback): this;
  override add(method: HttpMethod | string, path: string, callback: RouteCallback): this;
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
      this._changeEmitter.emit('change');
      return this;
    }

    if (isType(args[0])) {
      for (const type of args) {
        for (const route of new TypeRoutes(type as Type)) {
          this.add(route);
        }
      }
      return this;
    }

    if (args.length === 2) {
      const [path, callback] = args as [string, RouteCallback];
      const route = new RouteDescriptor({ path, callback });
      return this.add(route);
    }

    if (args.length === 3) {
      const [method, path, callback] = args as [HttpMethod | string, string, RouteCallback];
      const route = new RouteDescriptor({ path, method, callback });
      return this.add(route);
    }

    throw new Error('wrong number of args. see overloads.');
  }

  override clear(): void {
    super.clear();
    this._changeEmitter.emit('change');
  }

  override delete(value: RouteDescriptor): boolean {
    if (super.delete(value)) {
      this._changeEmitter.emit('change');
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
      for (const route of new TypeRoutes(type as Type)) {
        this.add(route);
      }
    }
    return this;
  }
}
