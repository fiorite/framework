import { Model, ModelFields, ModelFieldType } from '../data';
import { DbModelField, DbModelFieldBuilder } from './model-field';
import { DbPrimitiveValue } from './object';
import { MapCallback } from '../core';

export class DbModel<T = unknown> extends Model<T> {
  override get fields(): ModelFields<T, DbModelField> {
    return super.fields as ModelFields<T, DbModelField>;
  }

  constructor(
    readonly name: string,
    readonly keys: (keyof T | string | symbol)[],
    fields: ModelFields<T, DbModelField>,
  ) {
    super(fields);
  }
}

export class DbModelBuilder {
  readonly #optional: boolean;

  // get optional(): DbModelBuilder {
  //   return new DbModelBuilder(true);
  // }

  get string(): DbModelFieldBuilder<string> {
    return this.#field(ModelFieldType.String);
  }

  get number(): DbModelFieldBuilder<number> {
    return this.#field(ModelFieldType.Number);
  }

  get boolean(): DbModelFieldBuilder<boolean> {
    return this.#field(ModelFieldType.Boolean);
  }

  constructor(optional = false) {
    this.#optional = optional;
  }

  #field<T extends DbPrimitiveValue>(type: ModelFieldType): DbModelFieldBuilder<T> {
    const builder = new DbModelFieldBuilder(type);
    return this.#optional ? builder.optional : builder;
  }
}

export function makeDbModel<T>(name: string, configure: MapCallback<DbModelBuilder, Record<keyof T, DbModelFieldBuilder>>): DbModel<T> {
  const builder = new DbModelBuilder();
  const keys: (keyof T | string | symbol)[] = [];
  const fields = Object.entries<DbModelFieldBuilder>(configure(builder)).reduce((record, [key, fieldBuilder]) => {
    const { field, keyMark } = DbModelFieldBuilder.build(key, fieldBuilder);
    record[key as keyof T] = field;
    if (keyMark) {
      keys.push(key);
    }
    return record;
  }, {} as Partial<ModelFields<T, DbModelField>>) as ModelFields<T, DbModelField>;

  return new DbModel(name, keys, fields as ModelFields<T, DbModelField>);
}
