import { EmptyIterableError, first } from '../iterable/first';
import { DbReader } from './reader';
import { mapAsync, Sequence } from '../iterable';
import { DbModel } from './model';
import { DbQuery, DbWhere, DbWhereOperator } from './query';
import { PromiseAlike, promiseLikeWhenNoCallback, ValueCallback } from '../core';

// const snapshot = Symbol('DbModel.snapshot');
const modelName = Symbol('DbModel.name');

export class DbObjectNotFound<TModel = unknown> implements Error {
  readonly name = 'DbObjectNotFound';
  readonly message: string;

  // readonly #model: DbModel<TModel>;

  constructor(model: DbModel<TModel>) {
    // this.#model = model;
    this.message = 'Database object is not found (' + model.name + ').';
  }
}

export class DbSequence<T> extends Sequence<T> {
  readonly #reader: DbReader;
  readonly #model: DbModel<T>;
  #query?: DbQuery;

  constructor(reader: DbReader, model: DbModel<T>) {
    super({
      [Symbol.asyncIterator]: () => {
        return mapAsync<T, T>(object => {
          this.#setDebugInformation(object);
          // this.#setSnapshot(object, object);
          return object;
        })({
          [Symbol.asyncIterator]: () => this.#reader.read(this.#model, this.#query || {}),
        })[Symbol.asyncIterator]();
      }
    });
    this.#reader = reader;
    this.#model = model;
  }

  #setDebugInformation(object: T): void {
    Object.defineProperty(object, modelName, {
      value: this.#model.name,
      enumerable: true,
      writable: true,
    });
  }

  #ensureKeysSet(): void {
    if (!this.#model.keys.length) {
      throw new Error('model keys is not set. unable to perform an operation');
    }
  }

  // add(object: T, callback: VoidCallback): void;
  // add(object: T): PromiseAlike<void>;
  // add(object: T, callback?: VoidCallback): unknown {
  //   if (this.#getSnapshot(object)) {
  //     throw new Error('unable to add an item with bound snapshot.');
  //   }
  //
  //   return promiseLikeWhenNoCallback<void>(callback => {
  //     this.#adapter.createObject(this.#model as DbModel, object as DbObject, () => {
  //       this.#setSnapshot(object, object);
  //       callback();
  //     });
  //   }, callback);
  // }

  find(key: string | number | boolean, callback: ValueCallback<T>): void;
  find(key: string | number | boolean): PromiseAlike<T>;
  find<K extends keyof T & string>(keys: Record<K, T[K]>): PromiseAlike<T>;
  find<K extends keyof T & string>(keys: Record<K, T[K]>, callback: ValueCallback<T>): void;
  find(value: string | number | boolean | Record<string, unknown>, callback?: ValueCallback<T>): unknown {
    this.#ensureKeysSet();
    let sequence: DbSequence<T> = this; // todo: try to validate values based on type.
    if (['string', 'boolean', 'number'].includes(typeof value)) {
      if (this.#model.keys.length !== 1) {
        throw new Error('#get() received a single value whereas model (' + this.#model.name + ') keys number is different (' + this.#model.keys.length + ')');
      }
      sequence = sequence.where(this.#model.keys[0], value);
    } else {
      sequence = Object.entries(value as Record<string, unknown>).reduce((sequence, entry) => {
        const key = entry[0] as keyof T & string;
        if (!this.#model.keys.includes(key)) {
          throw new Error('unlisted key: ' + entry[0]);
        }
        return sequence.where(key, entry[1]);
      }, sequence);
    }

    return promiseLikeWhenNoCallback(callback => {
      try {
        sequence.find(callback);
      } catch (error) {
        if (error instanceof EmptyIterableError) {
          throw new DbObjectNotFound(this.#model);
        }
        throw error;
      }
    }, callback);
  }

  // #pickObjectKeys(object: T): Record<string, unknown> {
  //   return this.#model.keys.reduce((record, key) => {
  //     record[key] = object[key];
  //     return record;
  //   }, {} as Record<string, unknown>);
  // }
  //
  // update(object: T, callback: VoidCallback): void;
  // update(object: T): PromiseAlike<void>;
  // update(object: T, callback?: VoidCallback): unknown {
  //   this.#ensureKeysSet();
  //   const snapshot = this.#getSnapshot(object);
  //   if (undefined === snapshot) {
  //     throw new Error('unable to edit an item without bound snapshot.');
  //   }
  //
  //   const changes = Object.keys(object as object).filter(key => (object as DbObject)[key] !== (snapshot as DbObject)[key])
  //     .reduce((record, key) => {
  //       (record as any)[key] = (object as DbObject)[key];
  //       return record;
  //     }, {} as DbObject) as Partial<T>;
  //
  //   const keys = this.#pickObjectKeys(snapshot) as Partial<T>;
  //
  //   if (!Object.keys(changes).length) {
  //     if (callback) {
  //       callback();
  //       return;
  //     }
  //     return PromiseAlike.value(void 0);
  //   }
  //
  //   return promiseLikeWhenNoCallback<void>(callback => {
  //     this.#adapter.updateObject(this.#model as DbModel, keys, changes, () => {
  //       this.#setSnapshot(object, object);
  //       callback();
  //     });
  //   }, callback);
  // }
  //
  // delete(object: T): PromiseAlike<void>;
  // delete(object: T, callback: ValueCallback<void>): void;
  // delete(object: T, callback?: ValueCallback<void>): unknown {
  //   this.#ensureKeysSet();
  //   const snapshot = this.#getSnapshot(object);
  //   if (undefined === snapshot) {
  //     throw new Error('unable to edit an item without bound snapshot.');
  //   }
  //   const actual = this.#pickObjectKeys(object);
  //   const keys = this.#pickObjectKeys(snapshot) as Partial<T>;
  //
  //   if (
  //     Object.keys(actual).length !== Object.keys(keys).length ||
  //     Object.keys(actual).some(key => actual[key] !== (keys as DbObject)[key])
  //   ) {
  //     throw new Error('object keys ({' + JSON.stringify(actual) + '}) are different than snapshot ({' + JSON.stringify(keys) + '}). issue is wrong object could be deleted.');
  //   }
  //
  //   return promiseLikeWhenNoCallback<void>(callback => {
  //     this.#adapter.deleteObject(this.#model as DbModel, keys, () => {
  //       this.#setSnapshot(object);
  //       callback();
  //     });
  //   }, callback);
  // }

  override first(callback: ValueCallback<T>): void;
  override first(): PromiseAlike<T>;
  override first(callback?: ValueCallback<T>): unknown {
    return promiseLikeWhenNoCallback(callback => first<T>(callback)(this.take(1)), callback);
  }

  #cloneSequence(): DbSequence<T> {
    const clone = new DbSequence(this.#reader, this.#model);
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

  where<K extends keyof T & string>(key: K | string, value: T[K] | unknown): DbSequence<T>;
  where<K extends keyof T & string>(key: K | string, operator: DbWhereOperator, value: T[K] | unknown): DbSequence<T>;
  where(...args: unknown[]): DbSequence<T> {
    const whereSet = this.#query && this.#query.where ? new Set(this.#query.where) : new Set<DbWhere>();

    if (args.length === 2) {
      const where = new DbWhere(args[0] as string, DbWhereOperator.EqualTo, args[1]);
      whereSet.add(where);
    }

    if (args.length === 3) {
      const where = new DbWhere(args[0] as string, args[1] as DbWhereOperator, args[2]);
      whereSet.add(where);
    }

    return this.#withQuery({ where: whereSet });
  }

  // #getSnapshot<T>(object: T): T | undefined {
  //   const descriptor = Object.getOwnPropertyDescriptor(object, snapshot);
  //   return undefined !== descriptor ? descriptor.value as T : undefined;
  // };
  //
  // #setSnapshot<T>(object: T, value?: T): void {
  //   Object.defineProperty(object, snapshot, {
  //     value: undefined !== value ? { ...value } : undefined,
  //     enumerable: true,
  //     writable: true,
  //   });
  // };
}

