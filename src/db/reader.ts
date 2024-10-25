import { DbStoringModel, DbStoringObject } from './storing';
import { DbQuery } from './query';
import { AsyncLikeIterator } from '../iterable';

export interface DbReader {
  read(model: DbStoringModel, query: DbQuery): AsyncLikeIterator<DbStoringObject>;
}
