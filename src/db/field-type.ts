import { DbStoringType, DbStoringTypeToJs } from './storing';

export interface DbFieldType<T, R extends DbStoringType> {
  readonly displayName: string;
  readonly storingType: R;
  /** @deprecated bare idea to support size which might help to validate and set the size of db field */
  readonly storingSize?: number;

  transformForth(object: DbStoringTypeToJs[R]): T;

  transformBack(object: T): DbStoringTypeToJs[R];
}

export namespace dbPreDefinition {
  export class DbStringFieldType implements DbFieldType<string, DbStoringType.String> {
    readonly displayName = 'string';
    readonly storingType = DbStoringType.String;

    transformForth(object: string): string {
      return object;
    }

    transformBack(object: string): string {
      return object;
    }
  }

  export class DbNumberFieldType implements DbFieldType<number, DbStoringType.Number> {
    readonly displayName = 'number';
    readonly storingType = DbStoringType.Number;

    transformForth(object: number): number {
      return object;
    }

    transformBack(object: number): number {
      return object;
    }
  }

  export class DbBooleanFieldType implements DbFieldType<boolean, DbStoringType.Number> {
    readonly displayName = 'boolean';
    readonly storingType = DbStoringType.Number;
    readonly storingSize = 1;

    transformForth(object: number): boolean {
      return !(object === 0);
    }

    transformBack(object: boolean): number {
      return object ? 1 : 0;
    }
  }

  export class DbDateFieldType implements DbFieldType<Date, DbStoringType.Number> {
    readonly displayName = 'date';
    readonly storingType = DbStoringType.Number;
    // min size is 13 (timestamp with milliseconds)

    transformForth(object: number): Date {
      return new Date(object);
    }

    /**
     * Transforms to UTC. Perhaps, need a configuration for that.
     * @param object
     */
    transformBack(object: Date): number {
      return object.getTime() + object.getTimezoneOffset() * 60000;
    }
  }

  export class DbBinaryFieldType implements DbFieldType<Uint8Array, DbStoringType.Binary> {
    readonly displayName = 'binary';
    readonly storingType = DbStoringType.Binary;

    transformForth(object: Uint8Array): Uint8Array {
      return object;
    }

    transformBack(object: Uint8Array): Uint8Array {
      return object;
    }
  }
}
