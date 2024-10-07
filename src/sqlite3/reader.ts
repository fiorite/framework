import { Database } from 'sqlite3';
import { Sqlite3DbIterator } from './iterator';
import { DbModel, DbModelField, DbReadContext, DbReader } from '../db';
import { buildSqlite3Where } from './where';
import { Sqlite3LogSql } from './log-sql';

export class Sqlite3DbReader extends DbReader {
  readonly #database: Database;
  readonly #logSql: (sql: string, params?: unknown) => void;

  constructor(database: Database, logSql: Sqlite3LogSql) {
    super();
    this.#database = database;
    this.#logSql = logSql;
  }

  read<T>({ model, query }: DbReadContext<T>): Sqlite3DbIterator<T> {
    const columns = Object.values<DbModelField>(model.fields).map(x => x.name).join(', ');
    let sql = `SELECT ${columns} FROM ${model.name}`;
    const params: Record<string, unknown> = {};

    if (query.where && query.where.size) {
      const where = buildSqlite3Where(model as DbModel, query.where);
      Object.assign(params, where.params);
      sql += ' WHERE ' + where.sql;
    }

    if (undefined !== query.take && undefined !== query.skip) {
      sql += ` LIMIT ${query.skip}, ${query.take}`;
    } else if (undefined !== query.take) {
      sql += ` LIMIT ${query.take}`;
    } else if (undefined !== query.skip) {
      sql += ` LIMIT ${query.skip}, -1`;
    }

    this.#logSql(sql, params);
    const statement = this.#database.prepare(sql, params);
    return new Sqlite3DbIterator(model, statement);
  }
}
