import { DbLooseWhere, DbWhere } from './where';

export interface DbQuery<TWhere = DbWhere> {
  // readonly select?: (string | symbol)[];
  readonly take?: number;
  readonly skip?: number;
  readonly where?: readonly TWhere[];
}

/**
 * PromiseLike + AsyncLikeIterable for values. Loosen types become tie in middle iterator, so adapter operates with sync code.
 */
export type DbLooseQuery = DbQuery<DbLooseWhere>;
