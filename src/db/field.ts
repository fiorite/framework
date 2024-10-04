import { Equatable } from '../core';

export enum ModelFieldType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
}

export type ModelFieldTypeToJs = {
  [ModelFieldType.String]: String,
  [ModelFieldType.Number]: Number,
  [ModelFieldType.Boolean]: Boolean,
};

/** @deprecated will be used outside */
export abstract class ModelField implements Equatable {
  readonly #type: ModelFieldType;

  get type(): ModelFieldType {
    return this.#type;
  }

  readonly #optional: boolean;

  get optional(): boolean {
    return this.#optional;
  }

  protected constructor(type: ModelFieldType, optional?: boolean) {
    this.#type = type;
    this.#optional = Boolean(optional);
  }

  equals(other: unknown): other is this {
    return other instanceof ModelField &&
      other.type === this.type &&
      other.optional === this.optional;
  }
}

export class DbModelField extends ModelField {
  readonly #name: string;

  get name(): string {
    return this.#name;
  }

  readonly #default?: ModelFieldTypeToJs[typeof this.type];

  get default(): ModelFieldTypeToJs[typeof this.type] | undefined {
    return this.#default;
  }

  constructor(
    name: string,
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
