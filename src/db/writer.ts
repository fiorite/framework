import { DbModel } from './model';
import { VoidCallback } from '../core';
import { DbObject } from './object';
import { DbWhere } from './query';

export interface DbCreateContext {
  readonly model: DbModel;
  readonly object: DbObject;
}

export interface DbUpdateContext {
  readonly model: DbModel;
  readonly where: readonly DbWhere[];
  readonly snapshot: DbObject;
  readonly modified: DbObject;
}

export interface DbDeleteContext {
  readonly model: DbModel;
  readonly where: readonly DbWhere[];
  readonly snapshot: DbObject;
}

/**
 * level #2 of database implementation: db writer. create/update/delete records done here.
 */
export abstract class DbWriter {
  abstract create(context: DbCreateContext, callback: VoidCallback): void;

  abstract update(context: DbUpdateContext, callback: VoidCallback): void;

  abstract delete(context: DbDeleteContext, callback: VoidCallback): void;
}
