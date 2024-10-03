import { DbModelField, ModelField } from './field';

export type ObjectModelFields<TObject, TField extends ModelField = ModelField> = Record<keyof TObject & string, TField>;

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
  readonly #propertyToName = new Map<keyof T & string | string, string>();

  override get fields(): ObjectModelFields<T, DbModelField> {
    return super.fields as ObjectModelFields<T, DbModelField>;
  }

  constructor(
    readonly name: string,
    readonly keys: (keyof T & string)[],
    fields: ObjectModelFields<T, DbModelField>,
  ) {
    super(fields);
    Object.entries<DbModelField>(fields).forEach(entry => {
      this.#propertyToName.set(entry[0] as keyof T & string, entry[1].name);
    });
  }

  fieldName(key: keyof T & string | string): string {
    return this.#propertyToName.get(key)!;
  }
}
