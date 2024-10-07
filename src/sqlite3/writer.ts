import { DbCreateContext, DbDeleteContext, DbUpdateContext, DbWriter } from '../db';
import { VoidCallback } from '../core';
import { Database } from 'sqlite3';
import { buildSqlite3Where } from './where';
import { Sqlite3LogSql } from './log-sql';

export class Sqlite3DbWriter extends DbWriter {
  readonly #database: Database;
  readonly #logSql: (sql: string, params?: unknown) => void;

  constructor(database: Database, logSql: Sqlite3LogSql) {
    super();
    this.#database = database;
    this.#logSql = logSql;
  }

  create({ object, model }: DbCreateContext, callback: VoidCallback) {
    let counter = 0;
    const params: Record<string, unknown> = {};

    const result = Object.entries(object).reduce((record, entry) => {
      const column = model.fieldName(entry[0]);
      record.insert.push(column);

      const param = `$v${counter++}_${entry[0]}`;
      params[param] = entry[1];
      record.values.push(param);

      return record;
    }, {
      insert: [] as string[],
      values: [] as string[],
    });

    const sql = `INSERT INTO ${model.name}(${result.insert.join(', ')}) VALUES (${result.values.join(', ')})`;
    this.#logSql(sql, params);
    this.#database.run(sql, params, err => { // todo: think of autoincrement
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }

  update(context: DbUpdateContext, callback: VoidCallback): void {
    const where = buildSqlite3Where(context.model, context.where);
    const params = where.params;

    let counter = context.where.length;
    const set = Object.entries(context.modified).map(entry => {
      const param = `$v${counter++}_${entry[0]}`;
      params[param] = entry[1];
      const column = context.model.fieldName(entry[0]);
      return `${column} = ${param}`;
    }).join(', ');

    const sql = `UPDATE ${context.model.name} SET ${set} WHERE ${where.sql}`;
    this.#logSql(sql, params);
    this.#database.run(sql, params, err => {
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }

  delete(context: DbDeleteContext, callback: VoidCallback): void {
    const where = buildSqlite3Where(context.model, context.where);
    const sql = `DELETE FROM ${context.model.name} WHERE ${where.sql}`;
    this.#logSql(sql, where.params);
    this.#database.run(sql, where.params, err => {
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }
}
