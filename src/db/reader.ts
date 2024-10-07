import { DbModel } from './model';
import { DbQuery } from './query';
import { AsyncLikeIterableIterator } from '../iterable';

export interface DbReadContext<T> {
  readonly model: DbModel<T>;
  readonly query: DbQuery
}

/**
 * level #1 of database implementation: db reader. basically converts {@link query} to async sequence.
 */
export interface DbReader {
  read<T>(context: DbReadContext<T>): AsyncLikeIterableIterator<T>;
}
