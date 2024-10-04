import { Database } from 'sqlite3';
import { Sqlite3DbIterator } from './iterator';
import { DbModel, DbModelField, DbQuery, DbReader } from '../db';

export class Sqlite3DbReader implements DbReader {
  readonly #database: Database;
  readonly #logSql: (sql: string, params?: unknown) => void;

  constructor(database: Database, logSql: (sql: string, params?: unknown) => void) {
    this.#database = database;
    this.#logSql = logSql;
  }

  read<T>(model: DbModel<T>, query: DbQuery): Sqlite3DbIterator<T> {
    const columns = Object.values<DbModelField>(model.fields).map(x => x.name).join(', ');
    let sql = `SELECT ${columns} FROM ${model.name}`;
    let counter = 0;
    const params: Record<string, unknown> = {};

    if (query.where && query.where.size) {
      const wheres: string[] = [];

      query.where.forEach(where => {
        const column = model.fieldName(where.key as string);
        let operator: string;
        switch (where.operator) {
          case '==':
            operator = '=';
            break;
          case '!=':
            operator = '<>';
            break;
          default:
            throw new Error('unknown operator:' + where.operator);
        }
        const param = `$w${counter++}_${column}`;
        wheres.push(`${column} ${operator} ${param}`);
        params[param] = where.value;
      });

      sql += ' WHERE ' + wheres.join(' AND ');
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
