import { EmptyIterableError } from '../iterable';
import { DbModel } from './model';
import { MaybePromiseLike, promiseLikeCallback, promiseWhenNoCallback, ValueCallback, VoidCallback } from '../core';
import { DbDefaultValue, DbObject, DbValue } from './object';
import { DbWhere, DbWhereOperator } from './where';
import { DbObjectNotFound } from './errors';
import { DbReadSequence } from './read-sequence';
import { DbStoringObject } from './storing';
import { DbWriter } from './writer';
import { DbReader } from './reader';

export class DbSequence<T> extends DbReadSequence<T> {
  private readonly _writer?: DbWriter;

  constructor(model: DbModel<T>, reader: DbReader, writer?: DbWriter) {
    super(model, reader);
    this._writer = writer;
  }

  private _patchDefaultValues(object: Partial<T>): void {
    Object.entries(object).forEach(([key, value]) => {
      if (undefined === value) {
        const field = this._model.field(key as keyof T);
        if (!field.optional) {
          if (undefined === field.default) {
            throw new Error('db field is not optional and default value is not set. property key = '+field.propertyKey.toString());
          }
          (object as DbObject)[key] = DbDefaultValue.pull(field.default);
        }
      }
    });
  }

  private _transformBack(object: Partial<T>): DbStoringObject {
    return Object.entries(object).reduce((result, [key, value]) => {
      const field = this._model.field(key as keyof T);
      if (undefined === value) {
        if (!field.optional) {
          throw new Error(`db field is not optional. property key = ${field.propertyKey.toString()}`);
        }
        result[field.storingName] = undefined;
      } else {
        result[field.storingName] = field.type.transformBack(value);
      }
      return result;
    }, {} as DbStoringObject);
  }

  private _ensureWriterImplemented(): void {
    if (!this._writer) {
      throw new Error('writer is not implemented for current DbSequence.');
    }
  }

  private _ensureKeysSet(): void {
    if (!this._model.keys.length) {
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
      this._patchDefaultValues(object);
      this._writer!.create(this._model.storingModel, { object: this._transformBack(object) }, () => {
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
    let sequence: DbReadSequence<T> = this; // todo: try to validate values based on type.
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

  _makeWhereUsingKeys(object: T): DbWhere[] {
    return this._model.keys.map(key => {
      return new DbWhere(key as string, DbWhereOperator.EqualTo, (object as any)[key] as DbValue);
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
      return promiseLikeCallback(then => then(void 0));
    }

    return promiseWhenNoCallback<void>(callback => {
      this._writer!.update(this._model.storingModel, {
        object: this._transformBack(snapshot),
        change: this._transformBack(modified),
        where: this._remapWhere(this._makeWhereUsingKeys(snapshot)),
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
    const actual = this._makeWhereUsingKeys(object);
    const read = this._makeWhereUsingKeys(snapshot);

    if (
      Object.keys(actual).length !== Object.keys(read).length ||
      actual.some((where, index) => read[index].value !== where.value)
    ) {
      // todo: update error format since data has changed.
      throw new Error('object keys ({' + JSON.stringify(actual) + '}) are different than snapshot ({' + JSON.stringify(read) + '}). issue is wrong object could be deleted.');
    }

    return promiseWhenNoCallback<void>(callback => {
      this._writer!.delete(this._model.storingModel, {
        object: this._transformBack(snapshot),
        where: this._remapWhere(read)
      }, () => {
        this._setSnapshot(object);
        callback();
      });
    }, callback);
  }
}
