import { arrayRange } from './array';

/** @source https://stackoverflow.com/questions/22697936/binary-search-in-javascript */
function binarySearch(array: readonly number[], value: number) {
  let start = 0;
  let end = array.length - 1;

  while (start <= end) {
    let middle = Math.floor((start + end) / 2);

    if (array[middle] === value) {
      return middle;
    }

    if (value < array[middle]) {
      end = middle - 1;
    } else {
      start = middle + 1;
    }
  }
  return -1;
}

export class Utf16Sequence implements Iterable<number> {
  private readonly _array: readonly number[];

  get length(): number {
    return this._array.length;
  }

  constructor(array: readonly number[]) {
    this._array = array.slice().sort((a, b) => a - b);
  }

  includes(value: number): boolean;
  includes(string: string, at: number): boolean;
  includes(...args: unknown[]): boolean {
    return binarySearch(
      this._array,
      args.length === 1 ?
        args[0] as number :
        utf16.at(args[0] as string, args[1] as number)
    ) > -1;
  }

  [Symbol.iterator](): Iterator<number> {
    return this._array[Symbol.iterator]();
  }
}

export namespace utf16 {
  export const ascii: Record<string | number, number> = {
    null: 0,
    '\t': 9,
    '\n': 10,
    '\r': 13,
    '#': 35,
    ' ': 32,
    '!': 33,
    '$': 36,
    '%': 37,
    '&': 38,
    '\'': 39,
    '(': 40,
    ')': 41,
    '*': 42,
    '+': 43,
    ',': 44,
    '-': 45,
    '.': 46,
    '/': 47,
    0: 48,
    9: 57,
    ':': 58,
    ';': 59,
    '=': 61,
    '?': 63,
    '@': 64,
    A: 65,
    F: 70,
    Z: 90,
    '[': 91,
    '\\': 92,
    ']': 93,
    '_': 95,
    a: 97,
    f: 102,
    z: 122,
    '{': 123,
    '}': 125,
    '~': 126,
  };

  export function at(string: string, index: number): number {
    return string.charCodeAt(index);
  }

  export const whitespace = new Utf16Sequence([ascii[' '], ascii['\t'], ascii['\r'], ascii['\n']]);

  export const uppercase = new Utf16Sequence(arrayRange(ascii['A'], ascii['Z']));

  export const lowercase = new Utf16Sequence(arrayRange(ascii['a'], ascii['z']));

  export const digit = new Utf16Sequence(arrayRange(ascii[0], ascii[9]));

  export const alpha = new Utf16Sequence([...uppercase, ...lowercase]);

  export const alphanumeric = new Utf16Sequence([...digit, ...alpha]);

  export const hexdigit = new Utf16Sequence([
    ...digit,
    ...arrayRange(ascii['A'], ascii['F']),
    ...arrayRange(ascii['a'], ascii['f']),
  ]);

  /**
   * JS variable
   */
  export const variable = {
    start: new Utf16Sequence([
      ascii['$'],
      ...uppercase,
      ascii['_'],
      ...lowercase,
    ]),
    continue: new Utf16Sequence([
      ascii['$'],
      ...digit,
      ...uppercase,
      ascii['_'],
      ...lowercase,
    ]),
  };
}


