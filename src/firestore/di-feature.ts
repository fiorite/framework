import { DbConnectionName, DbManager } from '../db';
import { Firestore } from 'firebase-admin/firestore';
import { configureProvider, ServiceReference } from '../di';
import { FirestoreDbAdapter } from './adapter';

export function addFirestore(firestore: Firestore | ServiceReference<Firestore>, dbConnection?: DbConnectionName): void {
  // const databaseSymbol = Symbol(`firebase-admin.Firestore(${String(dbConnection || 'default')}):${firestore.databaseId}`);
  configureProvider(provide => {
    const dbAdapter = new FirestoreDbAdapter(firestore instanceof ServiceReference ? firestore.receive(provide) : firestore);
    provide(DbManager).set(dbConnection, dbAdapter);
  });
}
