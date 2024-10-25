import { DbDesigner } from './designer';
import { DbReader } from './reader';
import { DbWriter } from './writer';

export interface DbAdapter {
  /**
   * level 1: database reader (query, SELECT etc.)
   */
  readonly reader: DbReader;

  /**
   * level 2: database writer (create, update, delete)
   */
  readonly writer?: DbWriter;

  /**
   * level 3: describe database and allow migration
   */
  readonly designer?: DbDesigner;
}
