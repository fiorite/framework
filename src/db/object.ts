export type DbValue = string | number | boolean | Date | Uint8Array;

export type DbDefaultValue<T extends DbValue = DbValue> = T | (() => T);

export namespace DbDefaultValue {
  export function pull<T extends DbValue>(value: DbDefaultValue<T>): T {
    return typeof value === 'function' ? value() : value as T;
  }
}

export type DbObject = Record<string | symbol, DbValue | unknown>;
