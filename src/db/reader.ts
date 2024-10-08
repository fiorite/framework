import { DbQuery } from './query';
import { AsyncLikeIterableIterator } from '../iterable';
import { DbObject } from './object';
import { DbModelField } from './model-field';

export interface DbReadContext {
  readonly fields: readonly DbModelField[];
  readonly model: string;
  readonly query: DbQuery;
}

/**
 * level #1 of database implementation: db reader. basically converts {@link query} to async sequence.
 */
export interface DbReader {
  read(context: DbReadContext): AsyncLikeIterableIterator<DbObject>;
}
