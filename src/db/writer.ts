import { DbStoringModel, DbStoringObject } from './storing';
import { DbWhere } from './where';
import { VoidCallback } from '../core';

export interface DbCreateContext {
  readonly object: DbStoringObject;
}

export interface DbUpdateContext {
  readonly object: DbStoringObject;
  readonly change: DbStoringObject;
  readonly where: readonly DbWhere[];
}

export interface DbDeleteContext {
  readonly object: DbStoringObject;
  readonly where: readonly DbWhere[];
}

export interface DbWriter {
  create(model: DbStoringModel, context: DbCreateContext, done: VoidCallback): void;

  update(model: DbStoringModel, context: DbUpdateContext, done: VoidCallback): void;

  delete(model: DbStoringModel, context: DbDeleteContext, done: VoidCallback): void;
}
