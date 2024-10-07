import { EmptyIterableError, iterableFirst } from '../iterable/first';
import { DbReader } from './reader';
import { AsyncLikeIterator, AsyncSequence, iterableContains, iterableMap } from '../iterable';
import { DbModel } from './model';
import {
  DbLooseQuery,
  DbLooseWhere,
  DbPrimitiveValue,
  DbQuery,
  DbWhere,
  DbWhereCondition,
  DbWhereExpression,
  DbWhereKey,
  DbWhereOperator
} from './query';
import {
  callbackPromiseLike,
  EqualityComparer,
  MaybePromiseLike,
  promiseWhenNoCallback,
  ValueCallback,
  VoidCallback
} from '../core';
import { MaybeAsyncLikeIterable } from '../iterable/iterable';
import { DbWriter } from './writer';
import { DbObject } from './object';
import { DbModelField } from './field';
import { MiddleDbIterator } from './iterator';

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
  readonly #model: DbModel<T>;

  protected get _model(): DbModel<T> {
    return this.#model;
  }

  readonly #reader?: DbReader;

  /**
   * db sequence is going to resolve {@link MaybePromiseLike}, {@link MaybeAsyncLikeIterable} and deliver sync result to adapter.
   * @private
   */
  #query?: DbLooseQuery;

  constructor(model: DbModel<T>, reader?: DbReader) {
    super({
      [Symbol.asyncIterator]: () => {
        if (!this.#reader) {
          throw new Error('reader is not implemented for current DbSequence.');
        }

        return iterableMap<DbObject, T>(object => {
          const importObject = this.#remapObjectFromAdapter(object);
          this._setSnapshot(importObject, importObject);
          this.#setDebugInformation(importObject);
          return importObject;
        })({
          [Symbol.asyncIterator]: () => {
            const exportQuery = this.#remapQueryFields(this.#query || {});
            return new MiddleDbIterator(this.#reader!, this.#model as DbModel, exportQuery);
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

      if (!this.#model.keys.length) {
        return false;
      }

      return (this.#model.keys as (string | symbol)[]).every(key => {
        return x[key] === y[key];
      });
    }) as EqualityComparer<unknown>);
    this.#model = model;
    this.#reader = reader;
  }

  #remapObjectFromAdapter(object: DbObject): T {
    return Object.entries<DbModelField>(this.#model.fields).reduce((result, [key, field]) => {
      result[key] = object[field.name as any];
      return result;
    }, {} as DbObject) as T;
  }

  /**
   * Replace any field name from domain value to mapped one.
   * @param query
   * @private
   */
  #remapQueryFields(query: DbLooseQuery): DbLooseQuery {
    let where: Set<DbLooseWhere> | undefined;
    if (query.where) {
      where = new Set(this._remapWhere(query.where));
    }
    return { ...query, where };
  }

  protected _remapWhere<TWhere extends DbWhere<unknown, unknown>>(where: Iterable<TWhere>): TWhere[] {
    return Array.from(where).map(entry => entry.withKey((this.#model.fields as any)[entry.key]!.name)) as TWhere[];
  }

  #setDebugInformation(object: T): void {
    Object.defineProperty(object, modelName, {
      value: this.#model.name,
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

  #querySequence(): DbSequenceQuery<T> {
    const clone = new DbSequenceQuery(this.#model, this.#reader);
    clone.#query = this.#query;
    return clone;
  }

  #withQuery(object: DbQuery): DbSequenceQuery<T> {
    return this.#querySequence().#patchQuery(object);
  }

  #patchQuery(change: DbQuery): this {
    this.#query = this.#query ? { ...this.#query, ...change } : { ...change };
    return this;
  }

  override take(count: number): DbSequenceQuery<T> {
    return this.#withQuery({ take: count });
  }

  override skip(count: number): DbSequenceQuery<T> {
    return this.#withQuery({ skip: count });
  }

  where<K extends keyof T>(key: K, value: MaybePromiseLike<T[K] | undefined>): DbSequenceQuery<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: MaybePromiseLike<T[K] | undefined>): DbSequenceQuery<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: MaybePromiseLike<MaybeAsyncLikeIterable<T[K]>>): DbSequenceQuery<T>;
  where<K extends keyof T>(callback: (builder: DbWhereKey<T, MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>) => DbWhereExpression<T>): DbSequenceQuery<T>;
  where(...args: unknown[]): DbSequenceQuery<T> {
    const whereSet = this.#query && this.#query.where ? new Set(this.#query.where) : new Set<DbWhere>();

    if (args.length === 1) {
      const builder = new DbWhereKey(this.#model, DbWhereCondition.And, []);
      const expression = (args[0] as (builder: DbWhereKey<T>) => DbWhereExpression<T>)(builder);
      DbWhereExpression.stack(expression).forEach(where => whereSet.add(where));
    }

    if (args.length === 2) {
      const where = new DbWhere(args[0] as string, DbWhereOperator.EqualTo, args[1] as MaybePromiseLike<unknown>);
      whereSet.add(where as any);
    }

    if (args.length === 3) {
      const where = new DbWhere(args[0] as string, args[1] as any, args[2] as any);
      whereSet.add(where);
    }

    return this.#withQuery({ where: whereSet as any });
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
  readonly #writer?: DbWriter;

  constructor(model: DbModel<T>, reader?: DbReader, writer?: DbWriter) {
    super(model, reader);
    this.#writer = writer;
  }

  #remapObjectForAdapter(object: Partial<T>): DbObject {
    return Object.entries(object).reduce((result, [key, value]) => {
      result[(this._model.fields as any)[key].name] = value;
      return result;
    }, {} as DbObject);
  }

  #ensureWriterImplemented(): void {
    if (!this.#writer) {
      throw new Error('writer is not implemented for current DbSequence.');
    }
  }

  #ensureKeysSet(): void {
    if (!this._model.keys.length) {
      throw new Error('model keys is not set. unable to perform an operation');
    }
  }

  add(object: T, callback: VoidCallback): void;
  add(object: T): PromiseLike<void>;
  add(object: T, callback?: VoidCallback): unknown {
    this.#ensureWriterImplemented();

    if (this._getSnapshot(object)) {
      throw new Error('unable to add an item with bound Symbol(DbModel.snapshot).');
    }

    return promiseWhenNoCallback<void>(callback => {
      this.#writer!.create({ object: this.#remapObjectForAdapter(object), model: this._model.name }, () => {
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
    this.#ensureKeysSet();
    let sequence: DbSequenceQuery<T> = this; // todo: try to validate values based on type.
    if (['string', 'boolean', 'number'].includes(typeof value)) {
      if (this._model.keys.length !== 1) {
        throw new Error('#get() received a single value whereas model (' + this._model.name + ') keys number is different (' + this._model.keys.length + ')');
      }
      sequence = sequence.where(this._model.keys[0] as any, value as any);
    } else {
      sequence = Object.entries(value as Record<string, unknown>).reduce((sequence, entry) => {
        const key = entry[0] as keyof T & string;
        if (!this._model.keys.includes(key)) {
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
          throw new DbObjectNotFound(this._model);
        }
        throw error;
      }
    }, callback);
  }

  #makeWhereUsingKeys(object: T): DbWhere[] {
    return this._model.keys.map(key => {
      return new DbWhere(key as string, DbWhereOperator.EqualTo, (object as any)[key] as DbPrimitiveValue);
    });
  }

  update(object: T, callback: VoidCallback): void;
  update(object: T): PromiseLike<void>;
  update(object: T, callback?: VoidCallback): unknown {
    this.#ensureKeysSet();
    this.#ensureWriterImplemented();
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
      return callbackPromiseLike(then => then(void 0));
    }

    return promiseWhenNoCallback<void>(callback => {
      this.#writer!.update({
        model: this._model.name,
        modified: this.#remapObjectForAdapter(modified),
        snapshot: this.#remapObjectForAdapter(snapshot),
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
    this.#ensureWriterImplemented();
    this.#ensureKeysSet();
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
      this.#writer!.delete({
        model: this._model.name,
        where: this._remapWhere(read),
        snapshot: this.#remapObjectForAdapter(snapshot)
      }, () => {
        this._setSnapshot(object);
        callback();
      });
    }, callback);
  }
}
