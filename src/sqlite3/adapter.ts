import { Database } from 'sqlite3';
import { Sqlite3LogSql } from './log-sql';
import { DbAdapter } from '../db';
import { Sqlite3DbReader } from './reader';
import { Sqlite3DbWriter } from './writer';

export class Sqlite3DbAdapter extends DbAdapter {
  #reader: Sqlite3DbReader;

  get reader(): Sqlite3DbReader {
    return this.#reader;
  }

  #writer: Sqlite3DbWriter;

  get writer(): Sqlite3DbWriter {
    return this.#writer;
  }

  constructor(database: Database, logSql: Sqlite3LogSql) {
    super();
    this.#reader = new Sqlite3DbReader(database, logSql);
    this.#writer = new Sqlite3DbWriter(database, logSql);
  }
}
