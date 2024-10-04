export interface DbQuery {
  readonly take?: number;
  readonly skip?: number;
  readonly where?: Set<DbWhere>;
}

export enum DbWhereOperator {
  EqualTo = '==',
  NotEqualTo = '!=',
}

export class DbWhere<T = unknown, K extends keyof T & string = keyof T & string> {
  readonly #key: K | string;

  get key(): K | string {
    return this.#key;
  }

  readonly #operator: DbWhereOperator | string;

  get operator(): DbWhereOperator | string {
    return this.#operator;
  }

  readonly #value: T[K] | unknown;

  get value(): T[K] | unknown {
    return this.#value;
  }

  constructor(key: K | string, operator: DbWhereOperator | string, value: T[K] | unknown) {
    this.#key = key;
    this.#operator = operator;
    this.#value = value;
  }
}
