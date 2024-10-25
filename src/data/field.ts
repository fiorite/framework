import { Equatable } from '../core';

export enum ModelFieldType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date',
}

export type ModelFieldTypeToJs = {
  [ModelFieldType.String]: String,
  [ModelFieldType.Number]: Number,
  [ModelFieldType.Boolean]: Boolean,
  [ModelFieldType.Date]: Date,
};

/** @deprecated currently base for db mode, will be changed */
export abstract class ModelField implements Equatable {
  private readonly _name: string | symbol;

  get name(): string | symbol {
    return this._name;
  }

  private readonly _type: ModelFieldType;

  get type(): ModelFieldType {
    return this._type;
  }

  private readonly _optional: boolean;

  get optional(): boolean {
    return this._optional;
  }

  protected constructor(name: string | symbol, type: ModelFieldType, optional?: boolean) {
    this._name = name;
    this._type = type;
    this._optional = Boolean(optional);
  }

  equals(other: unknown): other is this {
    return other instanceof ModelField &&
      other.type === this.type &&
      other.optional === this.optional;
  }
}
