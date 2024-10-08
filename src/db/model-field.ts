import { ModelField, ModelFieldType, ModelFieldTypeToJs } from '../data';
import { DbPrimitiveValue } from './object';

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

export class DbModelFieldBuilder<T extends DbPrimitiveValue = DbPrimitiveValue> {
  static build(propertyKey: string | symbol, builder: DbModelFieldBuilder): {
    readonly field: DbModelField,
    readonly keyMark?: boolean;
  } {
    const field = new DbModelField(builder.#name || propertyKey, builder.#type, builder.#optional, builder.#default);
    return { field, keyMark: builder.#keyMark };
  }

  #type: ModelFieldType;
  #name?: string | symbol;
  #optional?: boolean;
  #keyMark?: boolean;
  #default?: DbPrimitiveValue | undefined;

  get optional(): this {
    this.#optional = true;
    return this;
  }

  get key(): this {
    this.#keyMark = true;
    return this;
  }

  constructor(type: ModelFieldType) {
    this.#type = type;
  }

  name(value: string | symbol): this {
    this.#name = value;
    return this;
  }

  default(value: T | undefined): this { // todo: add function as value generator as an alternative to primitive
    this.#default = value;
    return this;
  }
}
