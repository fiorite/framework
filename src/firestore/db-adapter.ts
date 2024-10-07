import { DbAdapter, DbReadContext, DbReader, DbWhereCondition } from '../db';
import { Filter, Firestore, Query } from 'firebase-admin/firestore';
import { AsyncLikeIterableIterator } from '../iterable';
import { Readable } from 'stream';
import { FirestoreDbIterator } from './db-iterator';

export class FirestoreDbAdapter implements DbAdapter, DbReader {
  #firestore: Firestore;

  get reader(): FirestoreDbAdapter {
    return this;
  }

  constructor(firestore: Firestore) {
    this.#firestore = firestore;
  }

  read<T>({ model, query }: DbReadContext<T>): AsyncLikeIterableIterator<T, unknown> {
    let collection: Query = this.#firestore.collection(model.name);

    if (query.where) {
      let filter: Filter;
      let condition: DbWhereCondition | undefined;
      for (const where of Array.from(query.where).reverse()) { // go backwards to apply filters, apparently fix required.
        const current = Filter.where(model.fieldName(where.key), where.operator, where.value);
        if (!condition) {
          condition = where.condition;
          filter = current;
          continue;
        }
        filter = DbWhereCondition.And === condition ? Filter.and(filter!, current) : Filter.or(filter!, current);
        condition = where.condition;
      }
      collection = collection.where(filter!);
    }

    if (query.take) {
      collection = collection.limit(query.take);
    }

    if (query.skip) {
      collection = collection.offset(query.skip);
    }

    return new FirestoreDbIterator(collection.stream() as Readable);
  }
}
