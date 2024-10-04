import { DbModel } from './model';
import { DbQuery } from './query';
import { AsyncLikeIterableIterator } from '../iterable';

/**
 * level #1 of database implementation: db reader. basically converts {@link query} to async sequence.
 */
export abstract class DbReader {
  abstract read<T>(model: DbModel<T>, query: DbQuery): AsyncLikeIterableIterator<T>;
}
