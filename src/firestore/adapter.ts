import {
  DbAdapter,
  DbCreateContext,
  DbDeleteContext,
  DbObject,
  DbQuery,
  DbReader,
  DbStoringModel,
  DbStoringObject,
  DbUpdateContext,
  DbWhere,
  DbWriter,
} from '../db';
import { CollectionReference, FieldPath, Firestore, Query } from 'firebase-admin/firestore';
import { Readable } from 'stream';
import { FirestoreDbIterator } from './iterator';
import { firestoreId } from './document';
import { VoidCallback } from '../core';
import { AsyncLikeIterator } from '../iterable';

export class FirestoreDbAdapter implements DbAdapter, DbReader, DbWriter {
  private _firestore: Firestore;

  get reader(): this {
    return this;
  }

  get writer(): this {
    return this;
  }

  constructor(firestore: Firestore) {
    this._firestore = firestore;
  }

  private _fieldKeyToFirestoreKey(key: string | symbol): FieldPath | string {
    return key === firestoreId ? FieldPath.documentId() : key as string;
  }

  read(model: DbStoringModel, query: DbQuery): AsyncLikeIterator<DbStoringObject> {
    const fields = model.fields.map(x => x.name);
    let collection: Query = this._firestore.collection(model.target)
      .select(...fields.filter(field => typeof field === 'string') as string[]);
    const includeDocumentId = fields.includes(firestoreId);

    if (query.where && query.where.length) {
      collection = query.where.reduce((collection, where) => {
        return collection.where(this._fieldKeyToFirestoreKey(where.key), where.operator, where.value);
      }, collection);
    }

    if (query.take) {
      collection = collection.limit(query.take);
    }

    if (query.skip) {
      collection = collection.offset(query.skip);
    }

    return new FirestoreDbIterator(collection.stream() as Readable, includeDocumentId);
  }

  create({ target }: DbStoringModel, { object }: DbCreateContext, callback: VoidCallback): void {
    const collection = this._firestore.collection(target);

    if (firestoreId in object) {
      // todo: add object key filter, leave strings,
      const data = Object.keys(object).filter((key: unknown) => key !== firestoreId).reduce((result, key) => {
        result[key] = object[key];
        return result;
      }, {} as DbObject); // new object without firestoreID

      collection.doc(object[firestoreId] as string).set(data).then(() => {
        callback();
      });
    } else {
      collection.add(object).then(document => {
        object[firestoreId as any] = document.id;
        callback();
      });

    }
  }

  private _findWhere(collection: CollectionReference, where: readonly DbWhere[]) {
    let query: Query = collection;
    for (const entry of where) {
      query = query.where(this._fieldKeyToFirestoreKey(entry.key), '==', entry.value);
    }
    return query.get();
  }

  update({ target }: DbStoringModel, { change: modified, where }: DbUpdateContext, callback: VoidCallback): void {
    const collection = this._firestore.collection(target);
    this._findWhere(collection, where).then(snapshot => {
      if (snapshot.size !== 1) {
        throw new Error('either no documents or more than one, no good.');
      } else {
        // todo: probably handle document id change, got to add it later.
        collection.doc(snapshot.docs[0].id).update(modified).then(() => {
          callback();
        });
      }
    });
  }

  delete({ target }: DbStoringModel, { where }: DbDeleteContext, callback: VoidCallback): void {
    const collection = this._firestore.collection(target);
    this._findWhere(collection, where).then(snapshot => {
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
