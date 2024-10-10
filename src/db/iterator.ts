import { AsyncLikeIterableIterator, iterableToArray, MaybeAsyncLikeIterable } from '../iterable';
import { DbObject } from './object';
import {
  ThenableCallback,
  thenableCallback,
  MaybePromiseLike,
  computedCallback,
  ComputedCallback,
  ValueCallback
} from '../core';
import { DbReader } from './reader';
import { DbModel } from './model';
import { DbLooseQuery, DbQuery } from './query';
import { DbWhere, DbWhereOperator } from './where';

/**
 * Middle iterator resolves async values and switch to reader.read() iterator further.
 * Experimental feature, idea to have rich functionality and write less in adapter code.
 */
export class MiddleDbIterator implements AsyncLikeIterableIterator<DbObject> {
  readonly #query: DbLooseQuery;
  readonly #share: ComputedCallback<AsyncLikeIterableIterator<DbObject>>;

  constructor(reader: DbReader, model: DbModel, query: DbLooseQuery) {
    this.#query = query;

    this.#share = computedCallback(complete => {
      this.#synchronizeQuery(query2 => {
        complete(reader.read({ model: model.name, query: query2, fields: Object.values(model.fields) }));
      });
    });
  }

  next(): ThenableCallback<IteratorResult<DbObject, unknown>> {
    return this.#share.value ? this.#share.value.next() : thenableCallback(then => {
      this.#share.then(iterator => iterator.next().then(then));
    });
  }

  return(value?: MaybePromiseLike<unknown>): ThenableCallback<IteratorResult<DbObject, unknown>> {
    if (this.#share.value) {
      if (this.#share.value.return) {
        return this.#share.value.return(value);
      } else {
        return thenableCallback(complete => {
          value ? MaybePromiseLike.then(() => value, value2 => {
            complete({ done: true, value: value2 });
          }) : complete({ done: true, value: undefined });
        });
      }
    }

    return thenableCallback(complete => {
      this.#share.then(iterator => {
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
          return thenableCallback(then => {
            MaybePromiseLike.then(() => where.value, value2 => {
              [DbWhereOperator.In, DbWhereOperator.NotIn].includes(where.operator) ?
                iterableToArray(then)(value2 as MaybeAsyncLikeIterable<unknown>) : then(value2);
            });
          });
        });
      }, values => { // resolve all async pieces.
        const whereArray: DbWhere[] = [];
        values.forEach((value, index) => {
          whereArray.push(new DbWhere(wheres[index].key, wheres[index].operator as any, value/*, wheres[index].condition*/));
        });
        callback({ ...this.#query as DbQuery, where: whereArray });
      });
    } else {
      callback({ ...this.#query as DbQuery });
    }
  }

  [Symbol.asyncIterator](): AsyncLikeIterableIterator<DbObject> {
    return this.#share.value || this;
  }
}
