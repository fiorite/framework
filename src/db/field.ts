import { DbDefaultValue, DbValue } from './object';
import { DbFieldType } from './field-type';
import { DbStoringType } from './storing';

export class DbField {
  private readonly _propertyKey: string | symbol;

  get propertyKey(): string | symbol {
    return this._propertyKey;
  }

  private readonly _type: DbFieldType<unknown, DbStoringType>;

  get type(): DbFieldType<unknown, DbStoringType> {
    return this._type;
  }

  private readonly _optional: boolean;

  get optional(): boolean {
    return this._optional;
  }

  private readonly _default?: DbDefaultValue;

  get default(): DbDefaultValue | undefined {
    return this._default;
  }

  private readonly _storingName: string | symbol;

  get storingName(): string | symbol {
    return this._storingName;
  }

  constructor(
    propertyKey: string | symbol,
    storingName: string | symbol,
    type: DbFieldType<unknown, DbStoringType>,
    optional?: boolean,
    default1?: DbDefaultValue
  ) {
    this._propertyKey = propertyKey;
    this._storingName = storingName;
    this._type = type;
    this._optional = optional === true;
    this._default = default1;
  }

  equals(other: unknown): other is this {
    return other instanceof DbField &&
      other.propertyKey === this.propertyKey &&
      other.type.displayName === this.type.displayName &&
      other.optional === this.optional &&
      other.default === this.default;
  }
}

export interface DbFieldBuilder<T extends DbValue = DbValue> {
  (size: number): this;
}

export class DbFieldBuilder<T extends DbValue = DbValue> //extends FunctionClass<(size: number) => DbFieldBuilder<T>> {
{
  static build(propertyKey: string | symbol, builder: DbFieldBuilder): {
    readonly field: DbField,
    readonly keyMark?: boolean;
  } {
    const field = new DbField(propertyKey, builder._name || propertyKey, builder._type, builder._optional, builder._default);
    return { field, keyMark: builder._keyMark };
  }

  private _type: DbFieldType<unknown, DbStoringType>;
  private _size?: number;
  private _name?: string | symbol;
  private _optional?: boolean;
  private _keyMark?: boolean;
  private _default?: DbDefaultValue<T>;

  get optional(): this {
    this._optional = true;
    return this;
  }

  get key(): this {
    this._keyMark = true;
    return this;
  }

  constructor(type: DbFieldType<T, DbStoringType>) {
    // super(size => {
    //   this._size = size;
    //   return this;
    // });
    this._type = type;
  }

  name(value: string | symbol): this {
    this._name = value;
    return this;
  }

  default(value: DbDefaultValue<T> | undefined): this {
    this._default = value;
    return this;
  }
}
