import { DbReader } from './reader';
import { DbWriter } from './writer';

export interface DbAdapter {
  readonly reader?: DbReader;
  readonly writer?: DbWriter;
}
