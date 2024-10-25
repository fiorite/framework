import { ValueCallback } from '../core';
import { DbStoringModel } from './storing';

export interface DbDesigner {
  // migrate(): unknown; // will be implemented next along with #orderBy

  /**
   * Retrieves actual structure of deployed models (table/collection/etc.), so it can be used to define difference for migration.
   * @param callback
   */
  describe(callback: ValueCallback<DbStoringModel[]>): void;
}
