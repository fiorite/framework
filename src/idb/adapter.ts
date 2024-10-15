import { DbObject, DbReadContext, DbReader } from '../db';
import { AsyncLikeIterableIterator } from '../iterable';
import { ComputedCallback, PromiseLikeCallback } from '../core';

// todo: investigate this and implement

export class IdbDbAdapter implements DbReader {
  private _name: string;
  private _version?: number;
  private _request: IDBOpenDBRequest;
  private _db: ComputedCallback<IDBDatabase>;

  constructor(name: string, version?: number) {
    this._name = name;
    this._version = version;
    this._request = window.indexedDB.open(name, version);
    this._db = new ComputedCallback(complete => {
      this._request.onerror = () => { // not allowed
        throw new Error('No permission to use IndexedDB.');
        // console.error("Why didn't you allow my web app to use IndexedDB?!");
        // throw event;
      };
      this._request.onsuccess = (event) => {
        complete((event as any).target.result);
      };
    });
  }

  read({ model }: DbReadContext): AsyncLikeIterableIterator<DbObject> {
    return new IdbDbIterator(
      new ComputedCallback(complete => {
        this._db.then(db => {
          const transaction = db.transaction([model]);
          const objectStore = transaction.objectStore(model);
          // todo: create objectStore if missing.
          complete(objectStore.openCursor());
        });
      }),
    );
  }
}

export class IdbDbIterator implements AsyncLikeIterableIterator<DbObject> {
  private _cursor: ComputedCallback<IDBRequest<IDBCursorWithValue | null>>;

  constructor(cursor: ComputedCallback<IDBRequest<IDBCursorWithValue | null>>) {
    this._cursor = cursor;
  }

  next(): PromiseLikeCallback<IteratorResult<DbObject, unknown>> {
    return new PromiseLikeCallback<IteratorResult<DbObject, unknown>>(complete => {
      this._cursor.then(value => {
        console.log(value);
      });
    });
  }

  [Symbol.asyncIterator] = () => this;
}
