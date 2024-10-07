import { applicationFeature, ApplicationFeature } from '../app';
import { addDbManager, DbConnectionName, DbManager } from '../db';
import { Firestore } from 'firebase-admin/firestore';
import { FirestoreDbAdapter } from './db-adapter';
import { ServiceReference } from '../di/service-ref';

export function addFirestoreDb(firestore: Firestore | ServiceReference<Firestore>, dbConnection?: DbConnectionName): ApplicationFeature {
  // const databaseSymbol = Symbol(`firebase-admin.Firestore(${String(dbConnection || 'default')}):${firestore.databaseId}`);

  return applicationFeature(
    serviceSet => {
      addDbManager().registerServices!(serviceSet);
    },
    provide => {
      const dbAdapter = new FirestoreDbAdapter(firestore instanceof ServiceReference ? firestore.receive(provide) : firestore);
      provide(DbManager).set(dbConnection, dbAdapter);
    },
  );
}
