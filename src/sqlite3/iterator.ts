import { Statement } from 'sqlite3';
import { AsyncLikeIterableIterator } from '../iterable';
import { CallbackPromiseLike, MaybePromiseLike } from '../core';
import { DbModel, DbModelField, DbObject, ModelFieldType } from '../db';

export class Sqlite3DbIterator<T, TReturn = unknown> implements AsyncLikeIterableIterator<T, TReturn> {
  readonly #model: DbModel<T>;
  readonly #statement: Statement;

  constructor(model: DbModel<T>, statement: Statement) {
    this.#model = model;
    this.#statement = statement;
  }

  #transform(object: DbObject): T { // todo: move to data manipulator instance.
    return Object.entries<DbModelField>(this.#model.fields)
      .reduce((object, [key, field]) => { // add name <=> key transformation
        const value = object[key];
        if (null === value) {
          object[key] = undefined;
        } else if (ModelFieldType.Boolean === field.type) {
          object[key] = 1 === value || '1' === value; // convert numeric|text to boolean
        }
        return object;
      }, object) as T;
  }

  next(): PromiseLike<IteratorResult<T, TReturn>> {
    return new CallbackPromiseLike(complete => {
      this.#statement.get((error: Error | null, row: DbObject) => {
        if (null !== error) {
          throw error;
        }

        complete(
          undefined === row ?
            { value: undefined as TReturn, done: true } : // todo: think of return type, maybe
            { value: this.#transform(row), done: false }
        );
      });
    });
  }

  return(value?: MaybePromiseLike<TReturn>): PromiseLike<IteratorResult<T, TReturn>> {
    return new CallbackPromiseLike(complete => {
      this.#statement.finalize((error?: Error) => {
        if (error) {
          throw error;
        }

        MaybePromiseLike.then(() => value, value2 => {
          complete({ value: value2 as TReturn, done: true });
        });
      });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
