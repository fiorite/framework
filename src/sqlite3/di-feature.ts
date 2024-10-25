import sqlite3 from 'sqlite3';
import { DbConnectionName, DbManager } from '../db';
import { Logger } from '../logging';
import { configureProvider } from '../di';
import { Sqlite3DbAdapter } from './adapter';

export function addSqlite3(filename: string, connectionName?: DbConnectionName): void {
  const databaseSymbol = Symbol(`sqlite3.Database(${String(connectionName || 'default')}):${filename}`);

  configureProvider(provider => {
    provider.addSingleton(databaseSymbol, () => new sqlite3.Database(filename));

    const logger = provider(Logger);
    const adapter = new Sqlite3DbAdapter(
      provider.get<sqlite3.Database>(databaseSymbol),
      (sql, params) => {
        params ? logger.debug('sql: ' + sql + '; params: ' + JSON.stringify(params)) : logger.debug('sql: ' + sql);
      }
    );
    provider(DbManager).set(connectionName, adapter);
  });
}
