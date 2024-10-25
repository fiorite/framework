import { AsyncLikeIterableIterator, AsyncLikeIterator, iterableToArray, MaybeAsyncLikeIterable } from '../iterable';
import {
  computedCallback,
  ComputedCallback,
  MaybePromiseLike,
  promiseLikeCallback,
  PromiseLikeCallback,
  ValueCallback
} from '../core';
import { DbLooseQuery, DbQuery } from './query';
import { DbWhere, DbWhereOperator } from './where';
import { DbStoringModel, DbStoringObject } from './storing';
import { DbReader } from './reader';

/**
 * Middle iterator resolves async values and switch to reader.read() iterator further.
 * Experimental feature, idea to have rich functionality and write less in adapter code.
 */
export class DbTyingIterator implements AsyncLikeIterableIterator<DbStoringObject> {
  private readonly _query: DbLooseQuery;
  private readonly _share: ComputedCallback<AsyncLikeIterator<DbStoringObject>>;

  constructor(reader: DbReader, model: DbStoringModel, query: DbLooseQuery) {
    this._query = query;

    this._share = computedCallback(complete => {
      this._tieQuery(query2 => {
        complete(reader.read(model, query2));
      });
    });
  }

  next(): PromiseLikeCallback<IteratorResult<DbStoringObject, unknown>> {
    return this._share.value ? this._share.value.next() : promiseLikeCallback(then => {
      this._share.then(iterator => iterator.next().then(then));
    });
  }

  return(value?: MaybePromiseLike<unknown>): PromiseLikeCallback<IteratorResult<DbStoringObject, unknown>> {
    if (this._share.value) {
      if (this._share.value.return) {
        return this._share.value.return(value);
      } else {
        return promiseLikeCallback(complete => {
          value ? MaybePromiseLike.then(() => value, value2 => {
            complete({ done: true, value: value2 });
          }) : complete({ done: true, value: undefined });
        });
      }
    }

    return promiseLikeCallback(complete => {
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

  private _tieQuery(callback: ValueCallback<DbQuery>): void {
    if (this._query.where) {
      const wheres = Array.from(this._query.where);

      MaybePromiseLike.all(() => {
        return wheres.map(where => {
          return promiseLikeCallback(then => {
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

  [Symbol.asyncIterator](): AsyncLikeIterableIterator<DbStoringObject> {
    return this;
  }
}
