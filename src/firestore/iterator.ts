import { AsyncLikeIterableIterator } from '../iterable';
import { Readable } from 'stream';
import { PromiseLikeCallback, promiseLikeCallback } from '../core';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestoreId } from './document';
import { DbStoringObject } from '../db';

export class FirestoreDbIterator implements AsyncLikeIterableIterator<DbStoringObject> {
  private readonly _stream: Readable;
  private readonly _includeDocumentId: boolean;

  constructor(stream: Readable, includeDocumentId: boolean) {
    stream.pause();
    this._stream = stream;
    this._includeDocumentId = includeDocumentId;
  }

  next(): PromiseLikeCallback<IteratorResult<DbStoringObject>> {
    return promiseLikeCallback(complete => {
      const removeListeners = () => {
        this._stream.off('data', dataListener);
        this._stream.off('end', endListener);
      };

      const dataListener = (document: QueryDocumentSnapshot) => {
        removeListeners();
        this._stream.pause();

        let value = document.data() as DbStoringObject;
        if (this._includeDocumentId) {
          value[firestoreId as any] = document.id;
        }

        complete({ done: false, value });
      };

      const endListener = () => {
        removeListeners();
        complete({ done: true, value: undefined });
      };

      this._stream.once('data', dataListener);
      this._stream.once('end', endListener);
      this._stream.resume();
    });
  }

  return(): PromiseLikeCallback<IteratorResult<DbStoringObject>> {
    return promiseLikeCallback(complete => {
      this._stream.destroy();
      complete({ value: undefined, done: true });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
