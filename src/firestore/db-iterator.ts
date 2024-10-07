import { AsyncLikeIterableIterator } from '../iterable';
import { Readable } from 'stream';
import { CallbackPromiseLike } from '../core';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestoreDocumentId } from './document-id';

export class FirestoreDbIterator<T> implements AsyncLikeIterableIterator<T> {
  readonly #stream: Readable;

  constructor(stream: Readable) {
    stream.pause();
    this.#stream = stream;
  }

  next(): PromiseLike<IteratorResult<T, unknown>> {
    return new CallbackPromiseLike(complete => {
      const removeListeners = () => {
        this.#stream.off('data', dataListener);
        this.#stream.off('end', endListener);
      };

      const dataListener = (document: QueryDocumentSnapshot) => {
        removeListeners();
        this.#stream.pause();

        complete({
          done: false,
          value: { ...document.data(), [firestoreDocumentId]: document.id, } as T
        });
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

  return(): PromiseLike<IteratorResult<T, unknown>> {
    return new CallbackPromiseLike(complete => {
      this.#stream.destroy();
      complete({ value: undefined, done: true });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
