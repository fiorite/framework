import { AsyncLikeIterableIterator, iterableToArray, MaybeAsyncLikeIterable } from '../iterable';
import { DbObject } from './object';
import {
  PromiseLikeCallback,
  futureCallback,
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
  private readonly _query: DbLooseQuery;
  private readonly _share: ComputedCallback<AsyncLikeIterableIterator<DbObject>>;

  constructor(reader: DbReader, model: DbModel, query: DbLooseQuery) {
    this._query = query;

    this._share = computedCallback(complete => {
      this._synchronizeQuery(query2 => {
        complete(reader.read({ model: model.name, query: query2, fields: Object.values(model.fields) }));
      });
    });
  }

  next(): PromiseLikeCallback<IteratorResult<DbObject, unknown>> {
    return this._share.value ? this._share.value.next() : futureCallback(then => {
      this._share.then(iterator => iterator.next().then(then));
    });
  }

  return(value?: MaybePromiseLike<unknown>): PromiseLikeCallback<IteratorResult<DbObject, unknown>> {
    if (this._share.value) {
      if (this._share.value.return) {
        return this._share.value.return(value);
      } else {
        return futureCallback(complete => {
          value ? MaybePromiseLike.then(() => value, value2 => {
            complete({ done: true, value: value2 });
          }) : complete({ done: true, value: undefined });
        });
      }
    }

    return futureCallback(complete => {
      this._share.then(iterator => {
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

  private _synchronizeQuery(callback: ValueCallback<DbQuery>): void {
    if (this._query.where) {
      const wheres = Array.from(this._query.where);

      MaybePromiseLike.all(() => {
        return wheres.map(where => {
          return futureCallback(then => {
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
        callback({ ...this._query as DbQuery, where: whereArray });
      });
    } else {
      callback({ ...this._query as DbQuery });
    }
  }

  [Symbol.asyncIterator](): AsyncLikeIterableIterator<DbObject> {
    return this._share.value || this;
  }
}
