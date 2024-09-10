import { DecoratorFunction, DecoratorOuterFunction } from './function-type';
import { arraySequenceEqual } from '../array';
import { Type } from '../type';
import type { ParameterDecoratorWithPayload } from './parameter';
import type { MethodDecoratorWithPayload } from './method';
import type { PropertyDecoratorWithPayload } from './property';
import type { ClassDecoratorWithPayload } from './class';

export interface DecoratorRecord<
  TPayload = unknown,
  TDecorator extends DecoratorFunction = DecoratorFunction,
  TPath extends unknown[] = unknown[]
> {
  readonly decorator: DecoratorOuterFunction<TDecorator>;
  readonly payload: TPayload;
  readonly path: TPath;
}

export class DecoratorRecorder {
  private static readonly instance = new DecoratorRecorder();

  private _data: DecoratorRecord[] = [];

  static addRecord<TPayload, TDecorator extends DecoratorFunction, TPath extends unknown[]>(
    record: DecoratorRecord<TPayload, TDecorator, TPath>
  ): void {
    return this.instance.addRecord(record as any);
  }

  static classSearch<TDecorator extends DecoratorOuterFunction<ClassDecorator>>(
    decorator: TDecorator,
    classType?: Type
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<ClassDecoratorWithPayload<infer P>> ? P : unknown,
    ClassDecorator, [Function]
  >[] {
    return this.instance.classSearch(decorator, classType);
  }

  static propertySearch<TDecorator extends DecoratorOuterFunction<PropertyDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<PropertyDecoratorWithPayload<infer P>> ? P : unknown,
    PropertyDecorator,
    [Object, string | symbol]
  >[] {
    return this.instance.propertySearch(decorator, classType, propertyKey);
  }

  static methodSearch<TDecorator extends DecoratorOuterFunction<MethodDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<MethodDecoratorWithPayload<infer P>> ? P : unknown,
    MethodDecorator, [Object, string | symbol, PropertyDescriptor]
  >[] {
    return this.instance.methodSearch(decorator, classType, propertyKey);
  }

  static parameterSearch<TDecorator extends DecoratorOuterFunction<ParameterDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<ParameterDecoratorWithPayload<infer P>> ? P : unknown,
    ParameterDecorator, [Object | Function, string | symbol | undefined, number]
  >[] {
    return this.instance.parameterSearch(decorator, classType, propertyKey, parameterIndex);
  }

  private constructor() {
  }

  addRecord<TPayload, TDecorator extends DecoratorFunction, TPath extends unknown[]>(
    record: DecoratorRecord<TPayload, TDecorator, TPath>
  ): void {
    this._data.push(record as any);
  }

  classSearch<TDecorator extends DecoratorOuterFunction<ClassDecorator>>(
    decorator: TDecorator,
    classType?: Type
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<ClassDecoratorWithPayload<infer P>> ? P : unknown,
    ClassDecorator, [Function]
  >[] {
    const callback = classType ? (
      (record: DecoratorRecord) => {
        return arraySequenceEqual([classType], record.path) && record.decorator === decorator;
      }
    ) : (record: DecoratorRecord) => record.decorator === decorator;

    return this._data.filter(callback) as any;
  }

  propertySearch<TDecorator extends DecoratorOuterFunction<PropertyDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<PropertyDecoratorWithPayload<infer P>> ? P : unknown,
    PropertyDecorator,
    [Object, string | symbol]
  >[] {
    const callback = propertyKey ? (
      (record: DecoratorRecord) => {
        return arraySequenceEqual([classType.prototype, propertyKey], record.path) && record.decorator === decorator;
      }
    ) : (record: DecoratorRecord) => record.path[0] === classType.prototype && record.decorator === decorator;

    return this._data.filter(callback) as any;
  }

  methodSearch<TDecorator extends DecoratorOuterFunction<MethodDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey?: string | symbol
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<MethodDecoratorWithPayload<infer P>> ? P : unknown,
    MethodDecorator, [Object, string | symbol, PropertyDescriptor]
  >[] {
    const callback = propertyKey ? (
      (record: DecoratorRecord) => {
        return arraySequenceEqual([classType.prototype, propertyKey], record.path.slice(0, 2)) &&
          record.decorator === decorator;
      }
    ) : (record: DecoratorRecord) => record.path[0] === classType.prototype && record.decorator === decorator;

    return this._data.filter(callback) as any;
  }

  parameterSearch<TDecorator extends DecoratorOuterFunction<ParameterDecorator>>(
    decorator: TDecorator,
    classType: Type,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ): readonly DecoratorRecord<
    TDecorator extends DecoratorOuterFunction<ParameterDecoratorWithPayload<infer P>> ? P : unknown,
    ParameterDecorator, [Object | Function, string | symbol | undefined, number]
  >[] {
    const target = propertyKey ? classType.prototype : classType;

    const callback = typeof parameterIndex === 'number' ? (
      (record: DecoratorRecord) => {
        return record.decorator === decorator &&
          arraySequenceEqual([target, propertyKey, parameterIndex], record.path);
      }
    ) : (record: DecoratorRecord) => {
      return record.decorator === decorator &&
        arraySequenceEqual([target, propertyKey], record.path.slice(0, 2));
    };

    return this._data.filter(callback) as any;
  }
}
