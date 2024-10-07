import {
  DbAdapter,
  DbCreateContext,
  DbDeleteContext,
  DbObject,
  DbReadContext,
  DbReader,
  DbUpdateContext,
  DbWhere,
  DbWriter
} from '../db';
import { CollectionReference, FieldPath, Firestore, Query } from 'firebase-admin/firestore';
import { Readable } from 'stream';
import { FirestoreDbIterator } from './iterator';
import { firestoreDocumentId } from './document';
import { VoidCallback } from '../core';

export class FirestoreDbAdapter implements DbAdapter, DbReader, DbWriter {
  #firestore: Firestore;

  get reader(): this {
    return this;
  }

  get writer(): this {
    return this;
  }

  constructor(firestore: Firestore) {
    this.#firestore = firestore;
  }

  #fieldKeyToFirestoreKey(key: string | symbol): FieldPath | string {
    return key === firestoreDocumentId ? FieldPath.documentId() : key as string;
  }

  read({ model, query, fields }: DbReadContext): FirestoreDbIterator {
    const fieldNames = fields.map(x => x.name);
    let collection: Query = this.#firestore.collection(model).select(
      ...fieldNames.filter(field => typeof field === 'string') as string[]
    );
    const includeDocumentId = fieldNames.includes(firestoreDocumentId);

    if (query.where && query.where.length) {
      query.where.forEach(where => {
        collection = collection.where(String(where.key), where.operator, where.value);
      });
      // let filter: Filter;
      // let condition: DbWhereCondition | undefined;
      // for (const where of Array.from(query.where).reverse()) { // go backwards to apply filters, apparently fix required.
      //   const key = this.#fieldKeyToFirestoreKey(where.key);
      //   const current = Filter.where(key, where.operator, where.value);
      //   if (!condition) {
      //     condition = where.condition;
      //     filter = current;
      //     continue;
      //   }
      //   filter = DbWhereCondition.And === condition ? Filter.and(filter!, current) : Filter.or(filter!, current);
      //   condition = where.condition;
      // }
      // collection = collection.where(filter!);
    }

    if (query.take) {
      collection = collection.limit(query.take);
    }

    if (query.skip) {
      collection = collection.offset(query.skip);
    }

    return new FirestoreDbIterator(collection.stream() as Readable, includeDocumentId);
  }

  create({ object, model }: DbCreateContext, callback: VoidCallback): void {
    const collection = this.#firestore.collection(model);

    if (firestoreDocumentId in object) {
      // todo: add object key filter, leave strings,
      const data = Object.keys(object).filter((key: unknown) => key !== firestoreDocumentId).reduce((result, key) => {
        result[key] = object[key];
        return result;
      }, {} as DbObject); // new object without firestoreID

      collection.doc(object[firestoreDocumentId] as string).set(data).then(() => {
        callback();
      });
    } else {
      collection.add(object).then(document => {
        object[firestoreDocumentId as any] = document.id;
        callback();
      });

    }
  }

  #findWhere(collection: CollectionReference, where: readonly DbWhere[]) {
    let query: Query = collection;
    for (const entry of where) {
      query = query.where(this.#fieldKeyToFirestoreKey(entry.key), '==', entry.value);
    }
    return query.get();
  }

  update({ model, modified, where }: DbUpdateContext, callback: VoidCallback): void {
    const collection = this.#firestore.collection(model);
    this.#findWhere(collection, where).then(snapshot => {
      if (snapshot.size !== 1) {
        throw new Error('either no documents or more than one, no good.');
      } else {
        // todo: probably handle documentid change, got to add it later.
        collection.doc(snapshot.docs[0].id).update(modified).then(() => {
          callback();
        });
      }
    });
  }

  delete({ model, where }: DbDeleteContext, callback: VoidCallback): void {
    const collection = this.#firestore.collection(model);
    this.#findWhere(collection, where).then(snapshot => {
      if (snapshot.size !== 1) {
        throw new Error('either no documents or more than one, no good.');
      } else {
        collection.doc(snapshot.docs[0].id).delete().then(() => {
          callback();
        });
      }
    });
  }
}
