import { DbField, DbFieldBuilder } from './field';
import { DbValue } from './object';
import { MapCallback } from '../core';
import { DbFieldType, dbPreDefinition } from './field-type';
import { DbStoringModel, DbStoringType } from './storing';

export class DbModel<T = unknown> {
  private _fieldMap: Map<string | symbol, DbField>;

  private readonly _storingModel: DbStoringModel;

  get storingModel(): DbStoringModel {
    return this._storingModel;
  }

  static fromStoringModel<T = unknown>(model: DbStoringModel): DbModel<T> {
    const fields = model.fields.map(storingField => {
      let type: DbFieldType<unknown, DbStoringType>;
      switch (storingField.type) {
        case DbStoringType.String:
          type = new dbPreDefinition.DbStringFieldType();
          break;
        case DbStoringType.Number:
          type = new dbPreDefinition.DbNumberFieldType();
          break;
        case DbStoringType.Binary:
          type = new dbPreDefinition.DbBinaryFieldType();
          break;
      }

      return new DbField(storingField.name, storingField.name, type, storingField.optional); // todo: add perhaps default value
    });

    return new DbModel<T>(model.target, model.keys as (keyof T)[], fields);
  }

  constructor(
    readonly name: string,
    readonly keys: (keyof T | string | symbol)[],
    readonly fields: readonly DbField[],
  ) {
    this._fieldMap = new Map(fields.map(field => ([field.propertyKey, field])));
    this._storingModel = {
      target: name,
      keys: keys as (string | symbol)[],
      fields: fields.map(field => {
        return { name: field.storingName, type: field.type.storingType, optional: true };
      }),
    };
  }

  field<K extends keyof T>(key: K): DbField {
    return this._fieldMap.get(key as string | symbol)!; // todo: throw an error if field does not exist
  }

  generateCode(add: readonly ('export' | 'readonly')[] = []): string {
    const addExport = add.includes('export');
    const addReadonly = add.includes('readonly');

    function capitalizeFirstLetter(val: string): string {
      return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }

    const fieldStrings = this.fields.map(field => {
      let typeScriptTye: string;

      switch (field.type.storingType) {
        case DbStoringType.String:
          typeScriptTye = 'string';
          break;
        case DbStoringType.Number:
          typeScriptTye = 'number';
          break;
        case DbStoringType.Binary:
          typeScriptTye = 'Uint8Array';
          break;
      }

      return `${
        typeof field.propertyKey === 'string' ? field.propertyKey :
          '[Symbol(\'' + field.propertyKey.description + '\')]'
      }${field.optional ? '?' : ''}: ${typeScriptTye};`;
    });

    return [
      (addExport ? 'export ' : '') + `interface ${capitalizeFirstLetter(this.name)} {`,
      ...fieldStrings.map(propertyString => '  ' + (addReadonly ? 'readonly ' : '') + propertyString),
      '}'
    ].join('\n');
  }
}

export class DbModelBuilder {
  private readonly _optional: boolean;

  get string(): DbFieldBuilder<string> {
    return this.field(new dbPreDefinition.DbStringFieldType());
  }

  get number(): DbFieldBuilder<number> {
    return this.field(new dbPreDefinition.DbNumberFieldType());
  }

  get boolean(): DbFieldBuilder<boolean> {
    return this.field(new dbPreDefinition.DbBooleanFieldType());
  }

  get date(): DbFieldBuilder<Date> {
    return this.field(new dbPreDefinition.DbDateFieldType());
  }

  get binary(): DbFieldBuilder<Uint8Array> {
    return this.field(new dbPreDefinition.DbBinaryFieldType());
  }

  constructor(optional = false) {
    this._optional = optional;
  }

  field<T extends DbValue>(type: DbFieldType<T, DbStoringType>): DbFieldBuilder<T> {
    const builder = new DbFieldBuilder<T>(type);
    return this._optional ? builder.optional : builder;
  }
}

export function makeDbModel<T>(name: string, configure: MapCallback<DbModelBuilder, Record<keyof T, DbFieldBuilder>>): DbModel<T> {
  const builder = new DbModelBuilder();
  const keys: (keyof T | string | symbol)[] = [];
  const fields = Object.entries<DbFieldBuilder>(configure(builder)).reduce((array, [key, fieldBuilder]) => {
    const { field, keyMark } = DbFieldBuilder.build(key, fieldBuilder);
    array.push(field);
    if (keyMark) {
      keys.push(key);
    }
    return array;
  }, [] as DbField[]);

  return new DbModel(name, keys, fields);
}
