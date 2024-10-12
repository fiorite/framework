import { AsyncLikeIterableIterator } from '../iterable';
import { Readable } from 'stream';
import { FutureCallback, futureCallback } from '../core';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestoreDocumentId } from './document';
import { DbObject } from '../db';

export class FirestoreDbIterator implements AsyncLikeIterableIterator<DbObject> {
  readonly #stream: Readable;
  readonly #includeDocumentId: boolean;

  constructor(stream: Readable, includeDocumentId: boolean) {
    stream.pause();
    this.#stream = stream;
    this.#includeDocumentId = includeDocumentId;
  }

  next(): FutureCallback<IteratorResult<DbObject, unknown>> {
    return futureCallback(complete => {
      const removeListeners = () => {
        this.#stream.off('data', dataListener);
        this.#stream.off('end', endListener);
      };

      const dataListener = (document: QueryDocumentSnapshot) => {
        removeListeners();
        this.#stream.pause();

        let value = document.data() as DbObject;
        if (this.#includeDocumentId) {
          value[firestoreDocumentId as any] = document.id;
        }

        complete({ done: false, value });
      };

      const endListener = () => {
        removeListeners();
        complete({ done: true, value: undefined });
      };

      this.#stream.once('data', dataListener);
      this.#stream.once('end', endListener);
      this.#stream.resume();
    });
  }

  return(): FutureCallback<IteratorResult<DbObject, unknown>> {
    return futureCallback(complete => {
      this.#stream.destroy();
      complete({ value: undefined, done: true });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
