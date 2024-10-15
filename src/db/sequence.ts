import { DbReader } from './reader';
import {
  AsyncLikeIterator,
  AsyncSequence,
  EmptyIterableError,
  iterableFirst,
  iterableMap,
  MaybeAsyncLikeIterable
} from '../iterable';
import { DbModel } from './model';
import { DbModelField } from './model-field';
import { DbLooseQuery, DbQuery, } from './query';
import {
  EqualityComparer,
  futureCallback,
  MaybePromiseLike,
  promiseWhenNoCallback,
  ValueCallback,
  VoidCallback
} from '../core';
import { DbWriter } from './writer';
import { DbObject, DbPrimitiveValue } from './object';
import { MiddleDbIterator } from './iterator';
import { DbLooseWhere, DbWhere, DbWhereOperator } from './where';

const snapshot = Symbol('DbModel.snapshot');

const modelName = Symbol('DbModel.name');

export class DbObjectNotFound<TModel = unknown> implements Error {
  readonly name = 'DbObjectNotFound';
  readonly message: string;

  constructor(model: DbModel<TModel>) {
    this.message = 'Database object is not found (' + model.name + ').';
  }
}

export class DbSequenceQuery<T> extends AsyncSequence<T> {
  private readonly _model: DbModel<T>;

  protected get model(): DbModel<T> {
    return this._model;
  }

  private readonly _reader?: DbReader;

  /**
   * db sequence is going to resolve {@link MaybePromiseLike}, {@link MaybeAsyncLikeIterable} and deliver sync result to adapter.
   * @private
   */
  private _query?: DbLooseQuery;

  constructor(model: DbModel<T>, reader?: DbReader) {
    super({
      [Symbol.asyncIterator]: () => {
        if (!this._reader) {
          throw new Error('reader is not implemented for current DbSequence.');
        }

        return iterableMap<DbObject, T>(object => {
          const importObject = this._remapObjectFromAdapter(object);
          this._setSnapshot(importObject, importObject);
          this._setDebugInformation(importObject);
          return importObject;
        })({
          [Symbol.asyncIterator]: () => {
            const exportQuery = this._remapQueryFields(this._query || {});
            return new MiddleDbIterator(this._reader!, this._model as DbModel, exportQuery);
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

  private _remapObjectFromAdapter(object: DbObject): T {
    return Object.entries<DbModelField>(this._model.fields).reduce((result, [key, field]) => {
      result[key] = object[field.name as any];
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

  protected _remapWhere<TWhere extends DbWhere<unknown, unknown>>(where: Iterable<TWhere>): TWhere[] {
    return Array.from(where).map(entry => entry.withKey((this._model.fields as any)[entry.key]!.name)) as TWhere[];
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

  private _querySequence(): DbSequenceQuery<T> {
    const clone = new DbSequenceQuery(this._model, this._reader);
    clone._query = this._query;
    return clone;
  }

  private _withQuery(object: DbQuery): DbSequenceQuery<T> {
    return this._querySequence()._patchQuery(object);
  }

  private _patchQuery(change: DbQuery): this {
    this._query = this._query ? { ...this._query, ...change } : { ...change };
    return this;
  }

  override take(count: number): DbSequenceQuery<T> {
    return this._withQuery({ take: count });
  }

  override skip(count: number): DbSequenceQuery<T> {
    return this._withQuery({ skip: count });
  }

  where<K extends keyof T>(key: K, value: MaybePromiseLike<T[K] | undefined>): DbSequenceQuery<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: MaybePromiseLike<T[K] | undefined>): DbSequenceQuery<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: MaybePromiseLike<MaybeAsyncLikeIterable<T[K]>>): DbSequenceQuery<T>;
  // where<K extends keyof T>(callback: (builder: DbWhereKey<T, MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>) => DbWhereExpression<T>): DbSequenceQuery<T>;
  where(...args: unknown[]): DbSequenceQuery<T> {
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

export class DbSequence<T> extends DbSequenceQuery<T> {
  private readonly _writer?: DbWriter;

  constructor(model: DbModel<T>, reader?: DbReader, writer?: DbWriter) {
    super(model, reader);
    this._writer = writer;
  }

  private _remapObjectForAdapter(object: Partial<T>): DbObject {
    return Object.entries(object).reduce((result, [key, value]) => {
      result[(this.model.fields as any)[key].name] = value;
      return result;
    }, {} as DbObject);
  }

  private _ensureWriterImplemented(): void {
    if (!this._writer) {
      throw new Error('writer is not implemented for current DbSequence.');
    }
  }

  private _ensureKeysSet(): void {
    if (!this.model.keys.length) {
      throw new Error('model keys is not set. unable to perform an operation');
    }
  }

  add(object: T, callback: VoidCallback): void;
  add(object: T): PromiseLike<void>;
  add(object: T, callback?: VoidCallback): unknown {
    this._ensureWriterImplemented();

    if (this._getSnapshot(object)) {
      throw new Error('unable to add an item with bound Symbol(DbModel.snapshot).');
    }

    return promiseWhenNoCallback<void>(callback => {
      this._writer!.create({ object: this._remapObjectForAdapter(object), model: this.model.name }, () => {
        this._setSnapshot(object, object);
        callback();
      });
    }, callback);
  }

  find(key: MaybePromiseLike<string | number | boolean>, callback: ValueCallback<T>): void;
  find(key: MaybePromiseLike<string | number | boolean>): PromiseLike<T>;
  find<K extends keyof T & string>(keys: Record<K, MaybePromiseLike<T[K]>>): PromiseLike<T>;
  find<K extends keyof T & string>(keys: Record<K, MaybePromiseLike<T[K]>>, callback: ValueCallback<T>): void;
  find(value: MaybePromiseLike<string | number | boolean> | Record<string, MaybePromiseLike<unknown>>, callback?: ValueCallback<T>): unknown {
    this._ensureKeysSet();
    let sequence: DbSequenceQuery<T> = this; // todo: try to validate values based on type.
    if (['string', 'boolean', 'number'].includes(typeof value)) {
      if (this.model.keys.length !== 1) {
        throw new Error('#get() received a single value whereas model (' + this.model.name + ') keys number is different (' + this.model.keys.length + ')');
      }
      sequence = sequence.where(this.model.keys[0] as any, value as any);
    } else {
      sequence = Object.entries(value as Record<string, unknown>).reduce((sequence, entry) => {
        const key = entry[0] as keyof T & string;
        if (!this.model.keys.includes(key)) {
          throw new Error('unlisted key: ' + entry[0]);
        }
        return sequence.where(key, entry[1] as any);
      }, sequence);
    }

    return promiseWhenNoCallback(callback => {
      try {
        sequence.first(callback);
      } catch (error) {
        if (error instanceof EmptyIterableError) {
          throw new DbObjectNotFound(this.model);
        }
        throw error;
      }
    }, callback);
  }

  #makeWhereUsingKeys(object: T): DbWhere[] {
    return this.model.keys.map(key => {
      return new DbWhere(key as string, DbWhereOperator.EqualTo, (object as any)[key] as DbPrimitiveValue);
    });
  }

  update(object: T, callback: VoidCallback): void;
  update(object: T): PromiseLike<void>;
  update(object: T, callback?: VoidCallback): unknown {
    this._ensureKeysSet();
    this._ensureWriterImplemented();
    const snapshot = this._getSnapshot(object);
    if (undefined === snapshot) {
      throw new Error('unable to edit an item without bound snapshot.');
    }

    const modified = Object.keys(object as object).filter(key => (object as DbObject)[key] !== (snapshot as DbObject)[key])
      .reduce((record, key) => {
        (record as any)[key] = (object as DbObject)[key];
        return record;
      }, {} as DbObject) as Partial<T>;

    if (!Object.keys(modified).length) {
      if (callback) {
        callback();
        return;
      }
      return futureCallback(then => then(void 0));
    }

    return promiseWhenNoCallback<void>(callback => {
      this._writer!.update({
        model: this.model.name,
        modified: this._remapObjectForAdapter(modified),
        snapshot: this._remapObjectForAdapter(snapshot),
        where: this._remapWhere(this.#makeWhereUsingKeys(snapshot)),
      }, () => {
        this._setSnapshot(object, object);
        callback();
      });
    }, callback);
  }

  delete(object: T): PromiseLike<void>;
  delete(object: T, callback: ValueCallback<void>): void;
  delete(object: T, callback?: ValueCallback<void>): unknown {
    this._ensureWriterImplemented();
    this._ensureKeysSet();
    const snapshot = this._getSnapshot(object);
    if (undefined === snapshot) {
      throw new Error('unable to edit an item without bound snapshot.');
    }
    const actual = this.#makeWhereUsingKeys(object);
    const read = this.#makeWhereUsingKeys(snapshot);

    if (
      Object.keys(actual).length !== Object.keys(read).length ||
      actual.some((where, index) => read[index].value !== where.value)
    ) {
      // todo: update error format since data has changed.
      throw new Error('object keys ({' + JSON.stringify(actual) + '}) are different than snapshot ({' + JSON.stringify(read) + '}). issue is wrong object could be deleted.');
    }

    return promiseWhenNoCallback<void>(callback => {
      this._writer!.delete({
        model: this.model.name,
        where: this._remapWhere(read),
        snapshot: this._remapObjectForAdapter(snapshot)
      }, () => {
        this._setSnapshot(object);
        callback();
      });
    }, callback);
  }
}
