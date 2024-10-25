export enum DbStoringType {
  String = 'string',
  Number = 'number',
  Binary = 'binary',
}

export type DbStoringTypeToJs = {
  [DbStoringType.String]: string;
  [DbStoringType.Number]: number;
  [DbStoringType.Binary]: Uint8Array;
}
