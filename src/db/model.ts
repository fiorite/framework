import { Model, ModelField, ModelFields, ModelFieldType, ModelFieldTypeToJs } from '../data';

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

export class DbModelField extends ModelField {
  readonly #name: string | symbol;

  get name(): string | symbol {
    return this.#name;
  }

  readonly #default?: ModelFieldTypeToJs[typeof this.type];

  get default(): ModelFieldTypeToJs[typeof this.type] | undefined {
    return this.#default;
  }

  constructor(
    name: string | symbol,
    type: ModelFieldType,
    optional?: boolean,
    default1?: ModelFieldTypeToJs[typeof type]
  ) {
    super(type, optional);
    this.#name = name;
    this.#default = default1;
  }

  override equals(other: unknown): other is this {
    return other instanceof DbModelField &&
      other.name === this.name &&
      other.type === this.type &&
      other.optional === this.optional &&
      other.default === this.default;
  }
}
