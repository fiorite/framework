import { ModelField } from './field';

/** @deprecated db model fields are array right now */
export type ModelFields<TObject, TField extends ModelField = ModelField> = Record<keyof TObject, TField>;

export abstract class Model<T> {
  private readonly _fields: ModelFields<T>;

  get fields(): ModelFields<T> {
    return this._fields;
  }

  protected constructor(fields: ModelFields<T>) {
    this._fields = fields;
  }
}
