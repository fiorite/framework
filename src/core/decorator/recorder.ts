import { DecoratorFunction, DecoratorOuterFunction } from './function-type';
import { isType, Type } from '../type';
import type { ParameterDecoratorWithPayload } from './parameter';
import type { MethodDecoratorWithPayload } from './method';
import type { PropertyDecoratorWithPayload } from './property';
import type { ClassDecoratorWithPayload } from './class';

export interface _DecoratorEvent<
  TPayload = unknown,
  TDecorator extends DecoratorFunction = DecoratorFunction,
  TPath extends unknown[] = unknown[]
> {
  readonly decorator: DecoratorOuterFunction<TDecorator>;
  readonly payload: TPayload;
  readonly path: TPath;
}

export class _DecoratorRecorder {
  private static readonly _instance = new _DecoratorRecorder();

  private _data: _DecoratorEvent[] = [];

  static addEvent<TPayload, TDecorator extends DecoratorFunction, TPath extends unknown[]>(
    event: _DecoratorEvent<TPayload, TDecorator, TPath>
  ): void {
    return _DecoratorRecorder._instance.addEvent(event);
  }

  static classSearch<TDecorator extends DecoratorOuterFunction<ClassDecorator>>(
    decorator: TDecorator,
    classType?: Type
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<ClassDecoratorWithPayload<infer P>> ? P : unknown,
    ClassDecorator, [Function]
  >[] {
    return _DecoratorRecorder._instance.classSearch(decorator, classType);
  }

  static propertySearch<TDecorator extends DecoratorOuterFunction<PropertyDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<PropertyDecoratorWithPayload<infer P>> ? P : unknown,
    PropertyDecorator,
    [Object, string | symbol]
  >[] {
    return _DecoratorRecorder._instance.propertySearch(decorator, classType, propertyKey);
  }

  static methodSearch<TDecorator extends DecoratorOuterFunction<MethodDecorator>>(
    decorator: TDecorator,
    classType?: Type,
    propertyKey?: string | symbol
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<MethodDecoratorWithPayload<infer P>> ? P : unknown,
    MethodDecorator, [Object, string | symbol, PropertyDescriptor]
  >[] {
    return _DecoratorRecorder._instance.methodSearch(decorator, classType, propertyKey);
  }

  static parameterSearch<TDecorator extends DecoratorOuterFunction<ParameterDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<ParameterDecoratorWithPayload<infer P>> ? P : unknown,
    ParameterDecorator, [Object | Function, string | symbol | undefined, number]
  >[] {
    return _DecoratorRecorder._instance.parameterSearch(decorator, classType, propertyKey, parameterIndex);
  }

  addEvent<TPayload, TDecorator extends DecoratorFunction, TPath extends unknown[]>(
    event: _DecoratorEvent<TPayload, TDecorator, TPath>
  ): void {
    if (!isType(event.path[0])) { // if Object provided, get its constructor.
      event.path[0] = (event.path[0] as Object).constructor;
    }

    this._data.push(event);
  }

  classSearch<TDecorator extends DecoratorOuterFunction<ClassDecorator>>(
    decorator: TDecorator,
    classType?: Type
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<ClassDecoratorWithPayload<infer P>> ? P : unknown,
    ClassDecorator, [Function]
  >[] {
    const callback = classType ? (
      (event: _DecoratorEvent) => {
        return event.decorator === decorator &&
          event.path.length === 1 &&
          event.path[0] === classType;
      }
    ) : (event: _DecoratorEvent) => event.decorator === decorator && event.path.length === 1;

    return this._data.filter(callback) as any;
  }

  propertySearch<TDecorator extends DecoratorOuterFunction<PropertyDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<PropertyDecoratorWithPayload<infer P>> ? P : unknown,
    PropertyDecorator,
    [Object, string | symbol]
  >[] {
    const callback = propertyKey ? (
      (event: _DecoratorEvent) => {
        return event.decorator === decorator &&
          event.path.length === 2 &&
          event.path[0] === classType &&
          event.path[1] === propertyKey;
      }
    ) : (event: _DecoratorEvent) => {
      return event.decorator === decorator &&
        event.path.length === 2 &&
        event.path[0] === classType;
    };

    return this._data.filter(callback) as any;
  }

  methodSearch<TDecorator extends DecoratorOuterFunction<MethodDecorator>>(
    decorator: TDecorator,
    classType?: Type,
    propertyKey?: string | symbol
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<MethodDecoratorWithPayload<infer P>> ? P : unknown,
    MethodDecorator, [Object, string | symbol, PropertyDescriptor]
  >[] {
    const callback = classType ? (
      propertyKey ? (
        (event: _DecoratorEvent) => {
          return event.decorator === decorator &&
            event.path.length === 3 &&
            event.path[0] === classType &&
            event.path[1] === propertyKey &&
            typeof event.path[2] !== 'number';
        }
      ) : (event: _DecoratorEvent) => {
        return event.decorator === decorator &&
          event.path.length === 3 &&
          event.path[0] === classType &&
          typeof event.path[2] !== 'number';
      }
    ) : (event: _DecoratorEvent) => {
      return event.decorator === decorator && event.path.length === 3 && typeof event.path[2] !== 'number';
    };

    return this._data.filter(callback) as any;
  }

  parameterSearch<TDecorator extends DecoratorOuterFunction<ParameterDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ): readonly _DecoratorEvent<
    TDecorator extends DecoratorOuterFunction<ParameterDecoratorWithPayload<infer P>> ? P : unknown,
    ParameterDecorator, [Object | Function, string | symbol | undefined, number]
  >[] {
    const callback = typeof parameterIndex === 'number' ? (
      (event: _DecoratorEvent) => {
        return event.decorator === decorator &&
          event.path.length === 3 &&
          event.path[0] === classType &&
          event.path[1] === propertyKey &&
          event.path[2] === parameterIndex;
      }
    ) : (event: _DecoratorEvent) => {
      return event.decorator === decorator &&
        event.path.length === 3 &&
        event.path[0] === classType &&
        event.path[1] === propertyKey &&
        typeof event.path[2] === 'number';
    };

    return this._data.filter(callback) as any;
  }
}
