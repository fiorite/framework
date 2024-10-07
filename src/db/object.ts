export type DbPrimitiveValue = string | number | boolean;

export type DbObject = Record<string | symbol, DbPrimitiveValue | unknown>;
