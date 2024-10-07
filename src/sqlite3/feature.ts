import { ApplicationFeature, applicationFeature } from '../app';
import { Database } from 'sqlite3';
import { addDbManager, DbManager } from '../db';
import { Sqlite3DbAdapter } from './adapter';
import { Logger } from '../logging';

export function addSqlite3(filename: string, connection?: string): ApplicationFeature {
  const databaseSymbol = Symbol(`sqlite3.Database(${connection || 'default'}):${filename}`);

  return applicationFeature(
    serviceSet => {
      addDbManager().registerServices!(serviceSet);
      serviceSet.addSingleton(databaseSymbol, () => new Database(filename));
    },
    provide => {
      const logger = provide(Logger);
      const adapter = new Sqlite3DbAdapter(
        provide<Database>(databaseSymbol),
        (sql, params) => {
          params ? logger.debug('sql: ' + sql + '; params: ' + JSON.stringify(params)) : logger.debug('sql: ' + sql);
        }
      );
      provide(DbManager).set(connection, adapter);
    },
  );
}
