import { ModelField, ModelFieldType, ModelFieldTypeToJs } from '../data';
import { DbPrimitiveValue } from './object';

export class DbModelField extends ModelField {
  private readonly _name: string | symbol;

  get name(): string | symbol {
    return this._name;
  }

  private readonly _default?: ModelFieldTypeToJs[typeof this.type];

  get default(): ModelFieldTypeToJs[typeof this.type] | undefined {
    return this._default;
  }

  constructor(
    name: string | symbol,
    type: ModelFieldType,
    optional?: boolean,
    default1?: ModelFieldTypeToJs[typeof type]
  ) {
    super(type, optional);
    this._name = name;
    this._default = default1;
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
    const field = new DbModelField(builder._name || propertyKey, builder._type, builder._optional, builder._default);
    return { field, keyMark: builder.  _keyMark };
  }

  private _type: ModelFieldType;
  private _name?: string | symbol;
  private _optional?: boolean;
  private _keyMark?: boolean;
  private _default?: DbPrimitiveValue | undefined;

  get optional(): this {
    this._optional = true;
    return this;
  }

  get key(): this {
    this.  _keyMark = true;
    return this;
  }

  constructor(type: ModelFieldType) {
    this._type = type;
  }

  name(value: string | symbol): this {
    this._name = value;
    return this;
  }

  default(value: T | undefined): this { // todo: add function as value generator as an alternative to primitive
    this._default = value;
    return this;
  }
}
