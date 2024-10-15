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
  private readonly _type: ModelFieldType;

  get type(): ModelFieldType {
    return this._type;
  }

  private readonly _optional: boolean;

  get optional(): boolean {
    return this._optional;
  }

  protected constructor(type: ModelFieldType, optional?: boolean) {
    this._type = type;
    this._optional = Boolean(optional);
  }

  equals(other: unknown): other is this {
    return other instanceof ModelField &&
      other.type === this.type &&
      other.optional === this.optional;
  }
}
