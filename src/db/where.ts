import { MaybePromiseLike } from '../core';
import { MaybeAsyncLikeIterable } from '../iterable';
import { DbPrimitiveValue } from './object';

export enum DbWhereOperator {
  EqualTo = '==',
  NotEqualTo = '!=',
  In = 'in',
  NotIn = 'not-in',
}

// export enum DbWhereCondition {
//   And = 'and',
//   Or = 'or',
// }

export class DbWhere<T = DbPrimitiveValue, TIterable = readonly T[]> {
  readonly #key: string | symbol;

  get key(): string | symbol {
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

  // readonly #condition: DbWhereCondition;
  //
  // get condition(): DbWhereCondition {
  //   return this.#condition;
  // }

  constructor(key: string | symbol, operator: DbWhereOperator.In | DbWhereOperator.NotIn | 'in' | 'not-in', value: TIterable/*, condition?: DbWhereCondition*/);
  constructor(key: string | symbol, operator: DbWhereOperator.EqualTo | DbWhereOperator.NotEqualTo | '==' | '!=', value: T | undefined/*, condition?: DbWhereCondition*/);
  constructor(key: string | symbol, operator: DbWhereOperator | string, value: unknown/*, condition: DbWhereCondition = DbWhereCondition.And*/) {
    this.#key = key;
    this.#operator = operator as DbWhereOperator;
    this.#value = value as typeof this.operator extends DbWhereOperator.In | DbWhereOperator.NotIn ? TIterable : T;
    // this.#condition = condition;
  }

  withKey(value: string): DbWhere<T, TIterable> {
    return new DbWhere<T, TIterable>(value, this.#operator as any, this.#value/*, this.#condition*/);
  }
}

/**
 * PromiseLike + AsyncLikeIterable for values. Loosen types become tie in middle iterator, so adapter operates with sync code.
 */
export type DbLooseWhere = DbWhere<MaybePromiseLike<DbPrimitiveValue>, MaybePromiseLike<MaybeAsyncLikeIterable<DbPrimitiveValue>>>;

// export type DbWhereKey<T, TValue = DbPrimitiveValue, TIterable = readonly T[]> = { [P in keyof T]: DbWhereKeyOperator<T, P, TValue, TIterable> };
//
// export type DbWhereKeyConstructor = new <T, TValue = DbPrimitiveValue, TIterable = readonly T[]>(model: DbModel<T>, condition: DbWhereCondition, stack: DbWhere[]) => DbWhereKey<T, TValue, TIterable>;
//
// namespace internal {
//   export class DbWhereKey<T> {
//     constructor(model: DbModel<T>, condition: DbWhereCondition, stack: DbWhere[]) {
//       const keys = Object.keys(model.fields);
//       return new Proxy(this, {
//         get: (_: this, key: string | symbol) => {
//           if (typeof key === 'string' && keys.includes(key)) {
//             return new DbWhereKeyOperator(model, key, condition, stack);
//           }
//
//           throw new Error('unknown where key: ' + String(key));
//         }
//       });
//     }
//   }
// }

// export const DbWhereKey = internal.DbWhereKey as DbWhereKeyConstructor;
//
// export class DbWhereKeyOperator<T, K extends keyof T, TValue, TIterable> {
//   readonly #model: DbModel<T>;
//   readonly #key: string;
//   readonly #condition: DbWhereCondition;
//   readonly #stack: DbWhere[];
//
//   constructor(model: DbModel<T>, key: string, condition: DbWhereCondition, stack: DbWhere[]) {
//     this.#model = model;
//     this.#key = key;
//     this.#condition = condition;
//     this.#stack = stack;
//   }
//
//   equalTo(value: TValue | undefined): DbWhereExpression<T> {
//     return new DbWhereExpression(
//       this.#model,
//       this.#key,
//       DbWhereOperator.EqualTo,
//       value,
//       this.#condition,
//       this.#stack
//     );
//   }
//
//   notEqualTo(value: TValue | undefined): DbWhereExpression<T> {
//     return new DbWhereExpression(
//       this.#model,
//       this.#key,
//       DbWhereOperator.NotEqualTo,
//       value,
//       this.#condition,
//       this.#stack,
//     );
//   }
//
//   in(values: TIterable): DbWhereExpression<T> {
//     return new DbWhereExpression(
//       this.#model,
//       this.#key,
//       DbWhereOperator.In,
//       values,
//       this.#condition,
//       this.#stack
//     );
//   }
//
//   notIn(values: TIterable): DbWhereExpression<T> {
//     return new DbWhereExpression(
//       this.#model,
//       this.#key,
//       DbWhereOperator.NotIn,
//       values,
//       this.#condition,
//       this.#stack
//     );
//   }
// }

// export class DbWhereExpression<T> {
//   readonly #model: DbModel<T>;
//   readonly #stack: DbWhere[] = [];
//
//   static stack<T>(expression: DbWhereExpression<T>): readonly DbWhere[] {
//     return expression.#stack;
//   }
//
//   get and(): DbWhereKey<T> {
//     return new DbWhereKey(this.#model, DbWhereCondition.And, this.#stack);
//   }
//
//   get or(): DbWhereKey<T> {
//     return new DbWhereKey(this.#model, DbWhereCondition.Or, this.#stack);
//   }
//
//   constructor(
//     model: DbModel<T>,
//     key: string,
//     operator: DbWhereOperator,
//     value: unknown,
//     condition: DbWhereCondition,
//     stack: DbWhere[],
//   ) {
//     this.#model = model;
//     this.#stack = [...stack, new DbWhere(key, operator as any, value, condition)];
//   }
// }

