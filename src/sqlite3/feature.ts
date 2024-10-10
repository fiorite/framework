import { ApplicationConfigureFunction } from '../app';
import { Database } from 'sqlite3';
import { DbConnectionName, DbManager } from '../db';
import { Sqlite3DbAdapter } from './adapter';
import { Logger } from '../logging';

export function addSqlite3(filename: string, connectionName?: DbConnectionName): ApplicationConfigureFunction {
  const databaseSymbol = Symbol(`sqlite3.Database(${String(connectionName || 'default')}):${filename}`);

  return provider => {
    provider.addSingleton(databaseSymbol, () => new Database(filename));

    const logger = provider(Logger);
    const adapter = new Sqlite3DbAdapter(
      provider<Database>(databaseSymbol),
      (sql, params) => {
        params ? logger.debug('sql: ' + sql + '; params: ' + JSON.stringify(params)) : logger.debug('sql: ' + sql);
      }
    );
    provider(DbManager).set(connectionName, adapter);
  };
}
