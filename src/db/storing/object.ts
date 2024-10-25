import { DbStoringValue } from './value';

export type DbStoringObject = Record<string | symbol, DbStoringValue | undefined>;
