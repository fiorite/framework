export interface DbQuery<TWhere = DbWhere> {
  readonly take?: number;
  readonly skip?: number;
  readonly where?: Set<TWhere>;
}

export enum DbWhereOperator {
  EqualTo = '==',
  NotEqualTo = '!=',
  In = 'in',
  NotIn = 'not-in',
}

export type DbPrimitiveValue = string | number | boolean | undefined;
type DbObject = Record<string, DbPrimitiveValue>;

export class DbWhere<T = DbPrimitiveValue, TIterable = readonly T[]> {
  readonly #key: string;

  get key(): string {
    return this.#key;
  }

  readonly #operator: DbWhereOperator;

  get operator(): DbWhereOperator {
    return this.#operator;
  }

  readonly #value: typeof this.operator extends DbWhereOperator.In | DbWhereOperator.NotIn ? TIterable : T;

  get value(): typeof this.operator extends DbWhereOperator.In | DbWhereOperator.NotIn ? TIterable : T {
    return this.#value;
  }

  constructor(key: string, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: TIterable);
  constructor(key: string, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: T);
  constructor(key: string, operator: DbWhereOperator | string, value: unknown) {
    this.#key = key;
    this.#operator = operator as DbWhereOperator;
    this.#value = value as typeof this.operator extends DbWhereOperator.In | DbWhereOperator.NotIn ? TIterable : T;
  }
}
