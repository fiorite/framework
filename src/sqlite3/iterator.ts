import sqlite3 from 'sqlite3';
import { AsyncLikeIterator } from '../iterable';
import { MaybePromiseLike, promiseLikeCallback, PromiseLikeCallback } from '../core';
import { DbStoringObject } from '../db';

export class Sqlite3DbIterator implements AsyncLikeIterator<DbStoringObject> {
  private readonly _statement: sqlite3.Statement;

  constructor(statement: sqlite3.Statement) {
    this._statement = statement;
  }

  private _transform(object: DbStoringObject): DbStoringObject { // todo: perhaps move to higher db layer
    Object.keys(object).forEach(key => {
      if (null === object[key]) {
        object[key] = undefined;
      }
    });
    return object;
  }

  next(): PromiseLikeCallback<IteratorResult<DbStoringObject>> {
    return promiseLikeCallback(complete => {
      this._statement.get((error: Error | null, row: DbStoringObject) => {
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

  return(value?: MaybePromiseLike<unknown>): PromiseLikeCallback<IteratorResult<DbStoringObject>> {
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
}
