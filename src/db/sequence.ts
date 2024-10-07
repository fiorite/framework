import { EmptyIterableError, iterableFirst } from '../iterable/first';
import { DbReader } from './reader';
import { AsyncLikeIterableIterator, AsyncLikeIterator, iterableMap, iterableToArray, Sequence } from '../iterable';
import { DbModel } from './model';
import {
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
  LazyCallbackShare,
  lazyCallbackShare,
  MaybePromiseLike,
  promiseWhenNoCallback,
  ValueCallback,
  VoidCallback
} from '../core';
import { MaybeAsyncLikeIterable } from '../iterable/iterable';
import { DbWriter } from './writer';
import { DbObject } from './object';
import { DbModelField } from './field';

const snapshot = Symbol('DbModel.snapshot');

const modelName = Symbol('DbModel.name');

type DbSequenceWhere = DbWhere<MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>;

type DbSequenceQuery = DbQuery<DbSequenceWhere>;

export class DbObjectNotFound<TModel = unknown> implements Error {
  readonly name = 'DbObjectNotFound';
  readonly message: string;

  constructor(model: DbModel<TModel>) {
    this.message = 'Database object is not found (' + model.name + ').';
  }
}

export class TransitionDbIterator implements AsyncLikeIterableIterator<DbObject> {
  readonly #query: DbSequenceQuery;
  readonly #share: LazyCallbackShare<AsyncLikeIterableIterator<DbObject>>;

  constructor(
    reader: DbReader,
    model: DbModel,
    query: DbSequenceQuery,
  ) {
    this.#query = query;

    this.#share = lazyCallbackShare(complete => {
      this.#synchronizeQuery(query2 => {
        complete(reader.read({ model: model.name, query: query2, fields: Object.values(model.fields) }));
      });
    });
  }

  next(): PromiseLike<IteratorResult<DbObject, unknown>> {
    return this.#share.value ? this.#share.value.next() : callbackPromiseLike(then => {
      this.#share(iterator => iterator.next().then(then));
    });
  }

  return(value?: MaybePromiseLike<unknown>): PromiseLike<IteratorResult<DbObject, unknown>> {
    if (this.#share.value) {
      if (this.#share.value.return) {
        return this.#share.value.return(value);
      } else {
        return callbackPromiseLike(complete => {
          value ? MaybePromiseLike.then(() => value, value2 => {
            complete({ done: true, value: value2 });
          }) : complete({ done: true, value: undefined });
        });
      }
    }

    return callbackPromiseLike(complete => {
      this.#share(iterator => {
        if (iterator.return) {
          iterator.return(value).then(complete);
        } else {
          value ? MaybePromiseLike.then(() => value, value2 => {
            complete({ done: true, value: value2 });
          }) : complete({ done: true, value: undefined });
        }
      });
    });
  }

  #synchronizeQuery(callback: ValueCallback<DbQuery>): void {
    if (this.#query.where) {
      const wheres = Array.from(this.#query.where);

      MaybePromiseLike.all(() => {
        return wheres.map(where => {
          return callbackPromiseLike(then => {
            MaybePromiseLike.then(() => where.value, value2 => {
              [DbWhereOperator.In, DbWhereOperator.NotIn].includes(where.operator) ?
                iterableToArray(then)(value2 as MaybeAsyncLikeIterable<unknown>) : then(value2);
            });
          });
        });
      }, values => { // resolve all async pieces.
        const where = new Set<DbWhere>();
        values.forEach((value, index) => {
          where.add(new DbWhere(wheres[index].key, wheres[index].operator as any, value, wheres[index].condition));
        });
        callback({ ...this.#query as DbQuery, where });
      });
    } else {
      callback({ ...this.#query as DbQuery });
    }
  }

  [Symbol.asyncIterator](): AsyncLikeIterableIterator<DbObject> {
    return this.#share.value || this;
  }
}

export class DbSequence<T> extends Sequence<T> {
  readonly #model: DbModel<T>;
  readonly #reader?: DbReader;
  readonly #writer?: DbWriter;

  /**
   * db sequence is going to resolve {@link MaybePromiseLike}, {@link MaybeAsyncLikeIterable} and deliver sync result to adapter.
   * @private
   */
  #query?: DbSequenceQuery;

  constructor(model: DbModel<T>, reader?: DbReader, writer?: DbWriter) {
    super({
      [Symbol.asyncIterator]: () => {
        if (!this.#reader) {
          throw new Error('reader is not implemented for current DbSequence.');
        }

        return iterableMap<DbObject, T>(object => {
          const importObject = this.#remapObjectFromAdapter(object);
          this.#setSnapshot(importObject, importObject);
          this.#setDebugInformation(importObject);
          return importObject;
        })({
          [Symbol.asyncIterator]: () => {
            const exportQuery = this.#remapQueryFields(this.#query || {});
            return new TransitionDbIterator(this.#reader!, this.#model as DbModel, exportQuery);
          },
        })[Symbol.asyncIterator]() as AsyncLikeIterator<T>;
      }
    });
    this.#model = model;
    this.#reader = reader;
    this.#writer = writer;
  }

  #remapObjectForAdapter(object: Partial<T>): DbObject {
    return Object.entries(object).reduce((result, [key, value]) => {
      result[(this.#model.fields as any)[key].name] = value;
      return result;
    }, {} as DbObject);
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
  #remapQueryFields(query: DbSequenceQuery): DbSequenceQuery {
    let where: Set<DbSequenceWhere> | undefined;
    if (query.where) {
      where = new Set(this.#remapWhere(query.where));
    }
    return { ...query, where };
  }

  #remapWhere<TWhere extends DbWhere<unknown, unknown>>(where: Iterable<TWhere>): TWhere[] {
    return Array.from(where).map(entry => entry.withKey((this.#model.fields as any)[entry.key]!.name)) as TWhere[];
  }

  #setDebugInformation(object: T): void {
    Object.defineProperty(object, modelName, {
      value: this.#model.name,
      enumerable: true,
      writable: true,
    });
  }

  #ensureWriterImplemented(): void {
    if (!this.#writer) {
      throw new Error('writer is not implemented for current DbSequence.');
    }
  }

  #ensureKeysSet(): void {
    if (!this.#model.keys.length) {
      throw new Error('model keys is not set. unable to perform an operation');
    }
  }

  add(object: T, callback: VoidCallback): void;
  add(object: T): PromiseLike<void>;
  add(object: T, callback?: VoidCallback): unknown {
    this.#ensureWriterImplemented();

    if (this.#getSnapshot(object)) {
      throw new Error('unable to add an item with bound Symbol(DbModel.snapshot).');
    }

    return promiseWhenNoCallback<void>(callback => {
      this.#writer!.create({ object: this.#remapObjectForAdapter(object), model: this.#model.name }, () => {
        this.#setSnapshot(object, object);
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
    let sequence: DbSequence<T> = this; // todo: try to validate values based on type.
    if (['string', 'boolean', 'number'].includes(typeof value)) {
      if (this.#model.keys.length !== 1) {
        throw new Error('#get() received a single value whereas model (' + this.#model.name + ') keys number is different (' + this.#model.keys.length + ')');
      }
      sequence = sequence.where(this.#model.keys[0] as any, value as any);
    } else {
      sequence = Object.entries(value as Record<string, unknown>).reduce((sequence, entry) => {
        const key = entry[0] as keyof T & string;
        if (!this.#model.keys.includes(key)) {
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
          throw new DbObjectNotFound(this.#model);
        }
        throw error;
      }
    }, callback);
  }

  #makeWhereUsingKeys(object: T): DbWhere[] {
    return this.#model.keys.map(key => {
      return new DbWhere(key as string, DbWhereOperator.EqualTo, (object as any)[key] as DbPrimitiveValue);
    });
  }

  update(object: T, callback: VoidCallback): void;
  update(object: T): PromiseLike<void>;
  update(object: T, callback?: VoidCallback): unknown {
    this.#ensureKeysSet();
    this.#ensureWriterImplemented();
    const snapshot = this.#getSnapshot(object);
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
        model: this.#model.name,
        modified: this.#remapObjectForAdapter(modified),
        snapshot: this.#remapObjectForAdapter(snapshot),
        where: this.#remapWhere(this.#makeWhereUsingKeys(snapshot)),
      }, () => {
        this.#setSnapshot(object, object);
        callback();
      });
    }, callback);
  }

  delete(object: T): PromiseLike<void>;
  delete(object: T, callback: ValueCallback<void>): void;
  delete(object: T, callback?: ValueCallback<void>): unknown {
    this.#ensureWriterImplemented();
    this.#ensureKeysSet();
    const snapshot = this.#getSnapshot(object);
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
        model: this.#model.name,
        where: this.#remapWhere(read),
        snapshot: this.#remapObjectForAdapter(snapshot)
      }, () => {
        this.#setSnapshot(object);
        callback();
      });
    }, callback);
  }

  override first(callback: ValueCallback<T>): void;
  override first(): PromiseLike<T>;
  override first(callback?: ValueCallback<T>): unknown {
    return promiseWhenNoCallback(callback => iterableFirst<T>(callback)(this.take(1)), callback);
  }

  #cloneSequence(): DbSequence<T> {
    const clone = new DbSequence(this.#model, this.#reader, this.#writer);
    clone.#query = this.#query;
    return clone;
  }

  #withQuery(object: DbQuery): DbSequence<T> {
    return this.#cloneSequence().#patchQuery(object);
  }

  #patchQuery(change: DbQuery): this {
    this.#query = this.#query ? { ...this.#query, ...change } : { ...change };
    return this;
  }

  override take(count: number): DbSequence<T> {
    return this.#withQuery({ take: count });
  }

  override skip(count: number): DbSequence<T> {
    return this.#withQuery({ skip: count });
  }

  where<K extends keyof T>(key: K, value: MaybePromiseLike<T[K] | undefined>): DbSequence<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: MaybePromiseLike<T[K] | undefined>): DbSequence<T>;
  where<K extends keyof T>(key: K, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: MaybePromiseLike<MaybeAsyncLikeIterable<T[K]>>): DbSequence<T>;
  where<K extends keyof T>(callback: (builder: DbWhereKey<T, MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>) => DbWhereExpression<T>): DbSequence<T>;
  where(...args: unknown[]): DbSequence<T> {
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

  #getSnapshot<T>(object: T): T | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(object, snapshot);
    return undefined !== descriptor ? descriptor.value as T : undefined;
  };

  #setSnapshot<T>(object: T, value?: T): void {
    Object.defineProperty(object, snapshot, {
      value: undefined !== value ? { ...value } : undefined,
      enumerable: true,
      writable: true,
    });
  };
}

