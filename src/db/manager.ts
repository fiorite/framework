import { DbAdapter } from './adapter';

export type DbConnectionName = string | symbol | undefined;

/** @deprecated not well thought class, will be changed as we go */
export class DbManager extends Map<DbConnectionName, DbAdapter> {
  constructor() {
    super();
  }

  get default(): DbAdapter | undefined {
    return this.get(undefined);
    // const adapter = this.get(undefined);
    // if (undefined === adapter) {
    //   throw new Error('default adapter is not set');
    // }
    // return adapter;
  }
}
