import { VoidCallback } from '../core';
import { DbObject } from './object';
import { DbWhere } from './where';

export interface DbCreateContext {
  readonly model: string;
  readonly object: DbObject;
}

export interface DbUpdateContext {
  readonly model: string;
  readonly where: readonly DbWhere[];
  readonly snapshot: DbObject;
  readonly modified: DbObject;
}

export interface DbDeleteContext {
  readonly model: string;
  readonly where: readonly DbWhere[];
  readonly snapshot: DbObject;
}

/**
 * level #2 of database implementation: db writer. create/update/delete records done here.
 */
export interface DbWriter {
  create(context: DbCreateContext, callback: VoidCallback): void;

  update(context: DbUpdateContext, callback: VoidCallback): void;

  delete(context: DbDeleteContext, callback: VoidCallback): void;
}
