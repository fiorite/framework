import { ModelField } from './field';

export type ModelFields<TObject, TField extends ModelField = ModelField> = Record<keyof TObject, TField>;

export abstract class Model<T> {
  readonly #fields: ModelFields<T>;

  get fields(): ModelFields<T> {
    return this.#fields;
  }

  protected constructor(fields: ModelFields<T>) {
    this.#fields = fields;
  }
}
