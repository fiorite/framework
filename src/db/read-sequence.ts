import { AsyncLikeIterator, AsyncSequence, iterableFirst, iterableMap, MaybeAsyncLikeIterable } from '../iterable';
import { DbModel } from './model';
import { DbLooseQuery, DbQuery } from './query';
import { DbObject } from './object';
import { DbTyingIterator } from './tying-iterator';
import { EqualityComparer, MaybePromiseLike, promiseWhenNoCallback, ValueCallback } from '../core';
import { DbLooseWhere, DbWhere, DbWhereOperator } from './where';
import { DbStoringObject } from './storing';
import { DbReader } from './reader';

const snapshot = Symbol('DbModel.snapshot');

const modelName = Symbol('DbModel.name');

export class DbReadSequence<T> extends AsyncSequence<T> {
  protected readonly _model: DbModel<T>;

  private readonly _reader: DbReader;

  /**
   * db sequence is going to resolve {@link MaybePromiseLike}, {@link MaybeAsyncLikeIterable} and deliver sync result to adapter.
   * @private
   */
  private _query?: DbLooseQuery;

  constructor(model: DbModel<T>, reader: DbReader) {
    super({
      [Symbol.asyncIterator]: () => {
        return iterableMap<DbStoringObject, T>(object => {
          const importObject = this._transformForth(object);
          this._setSnapshot(importObject, importObject);
          this._setDebugInformation(importObject);
          return importObject;
        })({
          [Symbol.asyncIterator]: () => {
            const exportQuery = this._remapQueryFields(this._query || {});
            return new DbTyingIterator(this._reader!, this._model.storingModel, exportQuery);
          },
        })[Symbol.asyncIterator]() as AsyncLikeIterator<T>;
      }
    }, ((x: DbObject, y: DbObject) => {
      if (
        x[modelName] && y[modelName] &&
        x[modelName] !== y[modelName]
      ) {
        return false;
      }

      if (!this._model.keys.length) {
        return false;
      }

      return (this._model.keys as (string | symbol)[]).every(key => {
        return x[key] === y[key];
      });
    }) as EqualityComparer<unknown>);
    this._model = model;
    this._reader = reader;
  }

  private _transformForth(object: DbStoringObject): T {
    return this._model.fields.reduce((result, field) => {
      const originalValue = object[field.storingName];
      if (undefined === originalValue) {
        if (!field.optional) {
          console.debug(`possible issue: db has provided undefined value whereas mapping is not optional: property key = ${field.propertyKey.toString()}, storing name = ${field.storingName.toString()}`); // todo: use logger
        }
        result[field.propertyKey] = undefined;
      } else {
        result[field.propertyKey] = field.type.transformForth(originalValue);
      }
      return result;
    }, {} as DbObject) as T;
  }

  /**
   * Replace any field name from domain value to mapped one.
   * @param query
   * @private
   */
  private _remapQueryFields(query: DbLooseQuery): DbLooseQuery {
    let where: DbLooseWhere[] | undefined;
    if (query.where) {
      where = this._remapWhere(query.where);
    }
    return { ...query, where };
  }

  protected _remapWhere<TWhere extends DbWhere<unknown, unknown>>(where: readonly TWhere[]): TWhere[] {
    return where.map(item => item.withKey(this._model.field(item.key as keyof T).storingName)) as TWhere[];
  }

  private _setDebugInformation(object: T): void {
    Object.defineProperty(object, modelName, {
      value: this._model.name,
      enumerable: true,
      writable: true,
    });
  }

  // todo: add partial value or one value like #find()

  override contains(value: MaybePromiseLike<Partial<T>>, callback: ValueCallback<boolean>): void;
  override contains(value: MaybePromiseLike<Partial<T>>): PromiseLike<boolean>;
  override contains(value: MaybePromiseLike<T>, callback?: ValueCallback<boolean>): unknown {
    return super.contains(value, callback as any); // todo: optimize with query later
  }

  override first(callback: ValueCallback<T>): void;
  override first(): PromiseLike<T>;
  override first(callback?: ValueCallback<T>): unknown {
    return promiseWhenNoCallback(callback => iterableFirst<T>(callback)(this.take(1)), callback);
  }

  private _querySequence(): DbReadSequence<T> {
    const clone = new DbReadSequence(this._model, this._reader);
    clone._query = this._query;
    return clone;
  }

  private _withQuery(object: DbQuery): DbReadSequence<T> {
    return this._querySequence()._patchQuery(object);
  }

  private _patchQuery(change: DbQuery): this {
    this._query = this._query ? { ...this._query, ...change } : { ...change };
    return this;
  }

  override take(count: number): DbReadSequence<T> {
    return this._withQuery({ take: count });
  }

  override skip(count: number): DbReadSequence<T> {
    return this._withQuery({ skip: count });
  }

  where<K extends keyof T>(key: K, value: MaybePromiseLike<T[K] | undefined>): DbReadSequence<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: MaybePromiseLike<T[K] | undefined>): DbReadSequence<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.GreaterThan | DbWhereOperator.GreaterThanOrEqualTo | DbWhereOperator.LessThan | DbWhereOperator.LessThanOrEqualTo | '>' | '>=' | '<' | '<=', value: MaybePromiseLike<T[K]>): DbReadSequence<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: MaybePromiseLike<MaybeAsyncLikeIterable<T[K]>>): DbReadSequence<T>;
  // where<K extends keyof T>(callback: (builder: DbWhereKey<T, MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>) => DbWhereExpression<T>): DbSequenceQuery<T>;
  where(...args: unknown[]): DbReadSequence<T> {
    const whereArray = this._query && this._query.where ? [...this._query.where] : [];

    // if (args.length === 1) {
    //   const builder = new DbWhereKey(this.#model, DbWhereCondition.And, []);
    //   const expression = (args[0] as (builder: DbWhereKey<T>) => DbWhereExpression<T>)(builder);
    //   DbWhereExpression.stack(expression).forEach(where => whereSet.add(where));
    // }

    if (args.length === 2) {
      const where = new DbWhere(args[0] as string, DbWhereOperator.EqualTo, args[1] as MaybePromiseLike<unknown>);
      whereArray.push(where as DbLooseWhere);
    }

    if (args.length === 3) {
      const where = new DbWhere(args[0] as string, args[1] as any, args[2] as any);
      whereArray.push(where as DbLooseWhere);
    }

    return this._withQuery({ where: whereArray as any }); // todo: fix type
  }

  protected _getSnapshot<T>(object: T): T | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(object, snapshot);
    return undefined !== descriptor ? descriptor.value as T : undefined;
  };

  protected _setSnapshot<T>(object: T, value?: T): void {
    Object.defineProperty(object, snapshot, {
      value: undefined !== value ? { ...value } : undefined,
      enumerable: true,
      writable: true,
    });
  };
}
