import { Database } from 'sqlite3';
import { Sqlite3LogSql } from './log-sql';
import {
  DbAdapter,
  DbCreateContext,
  DbDeleteContext,
  DbModel,
  DbModelField,
  DbReadContext,
  DbReader,
  DbUpdateContext,
  DbWriter
} from '../db';
import { Sqlite3DbIterator } from './iterator';
import { buildSqlite3Where } from './where';
import { VoidCallback } from '../core';

export class Sqlite3DbAdapter implements DbAdapter, DbReader, DbWriter {
  readonly #database: Database;
  readonly #logSql: Sqlite3LogSql;

  get reader(): Sqlite3DbAdapter {
    return this;
  }

  get writer(): Sqlite3DbAdapter {
    return this;
  }

  constructor(database: Database, logSql: Sqlite3LogSql) {
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
