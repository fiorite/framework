import { DbModelField, ModelField } from './field';

export type ObjectModelFields<TObject, TField extends ModelField = ModelField> = Record<keyof TObject, TField>;

abstract class ObjectModel<T> {
  readonly #fields: ObjectModelFields<T>;

  get fields(): ObjectModelFields<T> {
    return this.#fields;
  }

  protected constructor(fields: ObjectModelFields<T>) {
    this.#fields = fields;
  }
}

export class DbModel<T = unknown> extends ObjectModel<T> {
  override get fields(): ObjectModelFields<T, DbModelField> {
    return super.fields as ObjectModelFields<T, DbModelField>;
  }

  constructor(
    readonly name: string,
    readonly keys: (keyof T | string | symbol)[],
    fields: ObjectModelFields<T, DbModelField>,
  ) {
    super(fields);
  }
}
