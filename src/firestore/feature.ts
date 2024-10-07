import { ApplicationFeature } from '../app';
import { DbConnectionName, dbCoreServices, DbManager } from '../db';
import { Firestore } from 'firebase-admin/firestore';
import { FirestoreDbAdapter } from './adapter';
import { ServiceReference } from '../di';

export function addFirestore(firestore: Firestore | ServiceReference<Firestore>, dbConnection?: DbConnectionName): ApplicationFeature {
  // const databaseSymbol = Symbol(`firebase-admin.Firestore(${String(dbConnection || 'default')}):${firestore.databaseId}`);
  return {
    extendWith: dbCoreServices,
    configure: provide => {
      const dbAdapter = new FirestoreDbAdapter(firestore instanceof ServiceReference ? firestore.receive(provide) : firestore);
      provide(DbManager).set(dbConnection, dbAdapter);
    },
  };
}
