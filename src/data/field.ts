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
