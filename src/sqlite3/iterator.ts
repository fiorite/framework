import { Statement } from 'sqlite3';
import { AsyncLikeIterableIterator } from '../iterable';
import { promiseLikeCallback, MaybePromiseLike, PromiseLikeCallback } from '../core';
import { DbModelField, DbObject } from '../db';
import { ModelFieldType } from '../data';

export class Sqlite3DbIterator implements AsyncLikeIterableIterator<DbObject> {
  private readonly _fields: readonly DbModelField[];
  private readonly _statement: Statement;

  constructor(fields: readonly DbModelField[], statement: Statement) {
    this._fields = fields;
    this._statement = statement;
  }

  private _transform(object: DbObject): DbObject { // todo: move to data manipulator instance.
    return this._fields.reduce((result, field) => { // add name <=> key transformation
      const value = object[field.name as any];
      if (null === value) {
        result[field.name as any] = undefined;
      } else if (ModelFieldType.Boolean === field.type) {
        result[field.name as any] = 1 === value || '1' === value; // convert numeric|text to boolean
      } else {
        result[field.name as any] = value;
      }
      return object;
    }, {} as DbObject);
  }

  next(): PromiseLikeCallback<IteratorResult<DbObject>> {
    return promiseLikeCallback(complete => {
      this._statement.get((error: Error | null, row: DbObject) => {
        if (null !== error) {
          throw error;
        }

        complete(
          undefined === row ?
            { value: undefined, done: true } : // todo: think of return type, maybe
            { value: this._transform(row), done: false }
        );
      });
    });
  }

  return(value?: MaybePromiseLike<unknown>): PromiseLikeCallback<IteratorResult<DbObject>> {
    return promiseLikeCallback(complete => {
      this._statement.finalize((error?: Error) => {
        if (error) {
          throw error;
        }

        MaybePromiseLike.then(() => value, value2 => {
          complete({ value: value2, done: true });
        });
      });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
