import { ApplicationFeature } from '../app';
import { Database } from 'sqlite3';
import { DbConnectionName, dbCoreServices, DbManager } from '../db';
import { Sqlite3DbAdapter } from './adapter';
import { Logger } from '../logging';

export function addSqlite3(filename: string, connectionName?: DbConnectionName): ApplicationFeature {
  const databaseSymbol = Symbol(`sqlite3.Database(${String(connectionName || 'default')}):${filename}`);

  return {
    extendWith: dbCoreServices,
    registerServices: serviceSet => {
      serviceSet.addSingleton(databaseSymbol, () => new Database(filename));
    },
    configure: provide => {
      const logger = provide(Logger);
      const adapter = new Sqlite3DbAdapter(
        provide<Database>(databaseSymbol),
        (sql, params) => {
          params ? logger.debug('sql: ' + sql + '; params: ' + JSON.stringify(params)) : logger.debug('sql: ' + sql);
        }
      );
      provide(DbManager).set(connectionName, adapter);
    },
  };
}
