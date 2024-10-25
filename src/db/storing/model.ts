import { DbStoringField } from './field';

export interface DbStoringModel {
  readonly target: string,
  readonly keys: readonly (string | symbol)[],
  readonly fields: readonly DbStoringField[],
}
