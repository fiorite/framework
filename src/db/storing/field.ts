import { DbStoringType } from './type';

export interface DbStoringField {
  readonly name: string | symbol;
  readonly type: DbStoringType;

  /**
   * @deprecated will be used later to build length constraint and point out potential issue with saving value which has greater length.
   */
  readonly size?: number;

  /**
   * the rule is: #describe(...) returns it however, generated migration will never ask to be not null to be more flexible.
   * optional is going to be handled within domain, database should always be nullable.
   * (to avoid issues with migrations when not nullable appears and there is no instruction how to update existing records).
   */
  readonly optional?: boolean;
}
