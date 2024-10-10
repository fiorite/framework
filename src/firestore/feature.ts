import { ApplicationConfigureFunction } from '../app';
import { DbConnectionName, DbManager } from '../db';
import { Firestore } from 'firebase-admin/firestore';
import { FirestoreDbAdapter } from './adapter';
import { ServiceReference } from '../di';

export function addFirestore(firestore: Firestore | ServiceReference<Firestore>, dbConnection?: DbConnectionName): ApplicationConfigureFunction {
  // const databaseSymbol = Symbol(`firebase-admin.Firestore(${String(dbConnection || 'default')}):${firestore.databaseId}`);
  return provide => {
    const dbAdapter = new FirestoreDbAdapter(firestore instanceof ServiceReference ? firestore.receive(provide) : firestore);
    provide(DbManager).set(dbConnection, dbAdapter);
  };
}
