import { Statement } from 'sqlite3';
import { AsyncLikeIterableIterator } from '../iterable';
import { callbackPromiseLike, MaybePromiseLike } from '../core';
import { DbModelField, DbObject } from '../db';
import { ModelFieldType } from '../data';

export class Sqlite3DbIterator implements AsyncLikeIterableIterator<DbObject> {
  readonly #fields: readonly DbModelField[];
  readonly #statement: Statement;

  constructor(fields: readonly DbModelField[], statement: Statement) {
    this.#fields = fields;
    this.#statement = statement;
  }

  #transform(object: DbObject): DbObject { // todo: move to data manipulator instance.
    return this.#fields.reduce((result, field) => { // add name <=> key transformation
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

  next(): PromiseLike<IteratorResult<DbObject>> {
    return callbackPromiseLike(complete => {
      this.#statement.get((error: Error | null, row: DbObject) => {
        if (null !== error) {
          throw error;
        }

        complete(
          undefined === row ?
            { value: undefined, done: true } : // todo: think of return type, maybe
            { value: this.#transform(row), done: false }
        );
      });
    });
  }

  return(value?: MaybePromiseLike<unknown>): PromiseLike<IteratorResult<DbObject>> {
    return callbackPromiseLike(complete => {
      this.#statement.finalize((error?: Error) => {
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
