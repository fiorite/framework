import { DbReader } from './reader';
import { DbWriter } from './writer';

export abstract class DbAdapter {
  abstract readonly reader?: DbReader;
  abstract readonly writer?: DbWriter;
}
