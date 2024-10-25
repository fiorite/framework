/**
 * Storing layer provides bare minimum required compatibility for any database implementor.
 * Text is string, specific string-based type is string as well.
 * Number is integer, float, number in itself on JS level and boolean (0, 1).
 * Binary is array of numbers {@link Uint8Array} to save raw formats.
 */
export { DbStoringField } from './field';
export { DbStoringModel } from './model';
export { DbStoringObject } from './object';
export { DbStoringType, DbStoringTypeToJs } from './type';
export { DbStoringValue } from './value';
