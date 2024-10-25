import sqlite3 from 'sqlite3';
import { Sqlite3LogSql } from './log-sql';
import {
  DbAdapter,
  DbCreateContext,
  DbDeleteContext,
  DbDesigner,
  DbQuery,
  DbReader,
  DbStoringField,
  DbStoringModel,
  DbStoringObject,
  DbStoringType,
  DbUpdateContext,
  DbWriter,
} from '../db';
import { ValueCallback, VoidCallback } from '../core';
import { AsyncLikeIterator } from '../iterable';
import { buildSqlite3Where } from './where';
import { Sqlite3DbIterator } from './iterator';

export class Sqlite3DbAdapter implements DbAdapter, DbWriter, DbReader, DbDesigner {
  private readonly _database: sqlite3.Database;
  private readonly _logSql: Sqlite3LogSql;

  get reader(): this {
    return this;
  }

  get writer(): this {
    return this;
  }

  get designer(): this {
    return this;
  }

  constructor(database: sqlite3.Database, logSql: Sqlite3LogSql) {
    this._database = database;
    this._logSql = logSql;
  }

  read(model: DbStoringModel, query: DbQuery): AsyncLikeIterator<DbStoringObject> {
    const columns = model.fields.map(x => x.name).join(', ');
    let sql = `SELECT ${columns} FROM ${model.target}`;
    const params: Record<string, unknown> = {};

    if (query.where && query.where.length) {
      const where = buildSqlite3Where(query.where);
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

    this._logSql(sql, params);
    const statement = this._database.prepare(sql, params);
    return new Sqlite3DbIterator(statement);
  }

  create(model: DbStoringModel, { object }: DbCreateContext, callback: VoidCallback) {
    let counter = 0;
    const params: Record<string, unknown> = {};

    const result = Object.entries(object).reduce((record, entry) => {
      record.insert.push(entry[0]);

      const param = `$v${counter++}_${entry[0]}`;
      params[param] = entry[1];
      record.values.push(param);

      return record;
    }, {
      insert: [] as string[],
      values: [] as string[],
    });

    const sql = `INSERT INTO ${model.target}(${result.insert.join(', ')}) VALUES (${result.values.join(', ')})`;
    this._logSql(sql, params);
    this._database.run(sql, params, err => { // todo: think of autoincrement
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }

  update(model: DbStoringModel, { change: modified, where: _where }: DbUpdateContext, callback: VoidCallback): void {
    const where = buildSqlite3Where(_where);
    const params = where.params;

    let counter = _where.length;
    const set = Object.entries(modified).map(entry => {
      const param = `$v${counter++}_${entry[0]}`;
      params[param] = entry[1];
      const column = entry[0];
      return `${column} = ${param}`;
    }).join(', ');

    const sql = `UPDATE ${model.target} SET ${set} WHERE ${where.sql}`;
    this._logSql(sql, params);
    this._database.run(sql, params, err => {
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }

  delete(model: DbStoringModel, { where: _where }: DbDeleteContext, callback: VoidCallback): void {
    const where = buildSqlite3Where(_where);
    const sql = `DELETE FROM ${model.target} WHERE ${where.sql}`;
    this._logSql(sql, where.params);
    this._database.run(sql, where.params, err => {
      if (err) {
        throw err;
      } else {
        callback();
      }
    });
  }

  describe(callback: ValueCallback<DbStoringModel[]>): void {
    const sql = `SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`;
    this._logSql(sql);
    this._database.all(sql, (_, tables: {
      readonly name: string;
    }[]) => {
      if (!tables.length) {
        callback([]);
      }

      const models: DbStoringModel[] = [];
      let resolved = 0;

      tables.forEach((table) => {
        const sql = `PRAGMA table_info(${table.name})`;
        this._logSql(sql);
        // Example of table_info:
        //  {
        //     cid: 0,
        //     name: 'id',
        //     type: 'NUMERIC',
        //     notnull: 0,
        //     dflt_value: null,
        //     pk: 0
        //   },
        this._database.all(sql, (_, columns: {
          readonly cid: number;
          readonly name: string;
          readonly type: string;
          readonly notnull: number;
          readonly dflt_value: unknown;
          readonly pk: number;
        }[]) => {
          const keys = columns.filter(x => !!x.pk).map(x => x.name);
          const fields = columns.map(column => {
            let type: DbStoringType | undefined;

            let _type = column.type;
            // noinspection SuspiciousTypeOfGuard documentation says null|undefined type stands for BLOB (binary), just to be safe.
            const parenthesis = typeof _type === 'string' ? _type.indexOf('(') : -1;
            if (parenthesis > -1) { // ignore type size: anything inside parenthesis because sqlite3 ignores it.
              _type = _type.substring(0, parenthesis);
            }

            switch (_type.toUpperCase()) {  // source: https://www.sqlite.org/datatype3.html
              case 'INT':
              case 'INTEGER':
              case 'TINYINT':
              case 'SMALLINT':
              case 'MEDIUMINT':
              case 'BIGINT':
              case 'UNSIGNED BIG INT':
              case 'INT2':
              case 'INT8':
              case 'REAL':
              case 'DOUBLE':
              case 'DOUBLE PRECISION':
              case 'FLOAT':
              case 'NUMERIC':
              case 'DECIMAL':
              case 'BOOLEAN':
              case 'DATE':
              case 'DATETIME':
                type = DbStoringType.Number;
                break;
              case 'CHARACTER':
              case 'VARCHAR':
              case 'VARYING CHARACTER':
              case 'NCHAR':
              case 'NATIVE CHARACTER':
              case 'NVARCHAR':
              case 'TEXT':
              case 'CLOB':
                type = DbStoringType.String;
                break;
              case undefined:
              case null:
              case 'BLOB':
                type = DbStoringType.Binary;
                break;
            }

            return { name: column.name, type, optional: !column.notnull } as DbStoringField;
          });

          models.push({ target: table.name, keys, fields });
          resolved++;
          if (resolved === tables.length) {
            callback(models);
          }
        });
      });
    });
  }
}
