import { Type } from '../core';

// * or ** = catch all in aspnet core. catch-all is last param, cannot have anything in front of it.
// other than that
// 1. parse segments
// 2. matcher receives
// radix tree gets string prefix,
/**
 * router handle string, dynamic param and catch-the-rest (catch-all), astrix
 * regular parameters gated within segment. one segment can have couple parameters
 * parameter matcher might provide char[] list, if list is empty = only one parameter required per segment to avoid collision.
 */

const backslash = 92; // isolates reserved character
const colon = 58; // variable identifier
const slash = 47; // segment split
const dollar = 36;
const underscore = 95;
const asterisk = 42;
const parentheses1 = 40;
const parentheses2 = 41;
const comma = 44;
const equal = 61;
const whitespace = [
  32, 9, 13, 10,
];
const percent = 37;
const uppercase = [
  65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
];

const lowercase = [
  97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
];

const alpha = [
  ...uppercase,
  ...lowercase,
];

const digit = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
];

const alphanumeric = [
  ...alpha,
  ...digit,
];

const hexdig = [
  ...digit,
  // A-F
  65, 66, 67, 68, 69, 70,
  // a-f
  97, 98, 99, 100, 101, 102,
];

const variable = {
  first: [dollar, underscore, ...lowercase, ...uppercase],
  any: [dollar, underscore, ...lowercase, ...uppercase, ...digit],
};

export interface RoutePathComponent {
  readonly original?: string;

  equals(other: unknown): other is this;
}

export class NullRouteComponent implements RoutePathComponent {
  equals(other: unknown): other is this {
    return other instanceof NullRouteComponent;
  }
}

export class StaticPathComponent implements RoutePathComponent {
  constructor(readonly original: string) {
  }

  equals(other: unknown): other is this {
    return other instanceof StaticPathComponent && other.original === this.original;
  }
}

// // unreserved / pct-encoded / sub-delims / ":" / "@"
// /**
//  * path          = path-abempty    ; begins with "/" or is empty
//  *                     / path-absolute   ; begins with "/" but not "//"
//  *                     / path-noscheme   ; begins with a non-colon segment
//  *                     / path-rootless   ; begins with a segment
//  *                     / path-empty      ; zero characters
//  *
//  *       path-abempty  = *( "/" segment )
//  *       path-absolute = "/" [ segment-nz *( "/" segment ) ]
//  *       path-noscheme = segment-nz-nc *( "/" segment )
//  *       path-rootless = segment-nz *( "/" segment )
//  *       path-empty    = 0<pchar>
//  *
//  *  segment       = *pchar
//  *       segment-nz    = 1*pchar
//  *       segment-nz-nc = 1*( unreserved / pct-encoded / sub-delims / "@" )
//  *                     ; non-zero-length segment without any colon ":"
//  *
//  *       pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
//  *
//  * pct-encoded = "%" HEXDIG HEXDIG
//  *  sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
//  *                   / "*" / "+" / "," / ";" / "="
//  * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
//  * gen-delims = ":" / "/" / "?" / "#" / "[" / "]" / "@"
//  *
//  */

// add pct-encoded
const pchar = [
  ...alpha,
  ...digit,
  // "-" / "." / "_" / "~"
  45, 46, 95, 126,
  // sub-delims
  33, 36, 38, 39, 40, 41, 42, 43, 44, 59, 61,
  // ":" / "@"
  58, 64,
];

// constraints: number, boolean, alpha, alphanumeric, length, maxlength, uuid

interface DynamicComponentConstraint<T = unknown> {
  readonly name: string;
  readonly charList?: readonly number[];
  readonly minLength?: number;
  readonly maxLength?: number;

  match(term: string): T | undefined;
}

class NumberComponentConstraint implements DynamicComponentConstraint<number> {
  readonly name = 'number';
  readonly charList = digit;

  match(term: string): number | undefined {
    const number = Number(term);
    return Number.isNaN(number) ? undefined : number;
  }
}

class AlphaComponentConstraint implements DynamicComponentConstraint<string> {
  readonly name = 'alpha';
  readonly charList = alpha;

  match(term: string): string | undefined {
    if (!term.length) {
      return undefined;
    }
    let i = 0;
    while (i < term.length) {
      if (!this.charList.includes(term.charCodeAt(i))) {
        return undefined;
      }
      i++;
    }
    return term;
  }
}

class AlphanumericComponentConstraint implements DynamicComponentConstraint<string> {
  readonly name = 'alphanumeric';
  readonly charList = alphanumeric;

  match(term: string): string | undefined {
    if (!term.length) {
      return undefined;
    }
    let i = 0;
    while (i < term.length) {
      if (!this.charList.includes(term.charCodeAt(i))) {
        return undefined;
      }
      i++;
    }
    return term;
  }
}

class MaxlengthComponentConstraint implements DynamicComponentConstraint<string> {
  readonly name = 'maxlength';
  readonly maxLength: number;

  constructor(number: number) {
    this.maxLength = number;
  }

  match(term: string): string | undefined {
    return term.length > this.maxLength ? undefined : term;
  }
}

class MinlengthComponentConstraint implements DynamicComponentConstraint<string> {
  readonly name = 'minlength';
  readonly minLength: number;

  constructor(number: number) {
    this.minLength = number;
  }

  match(term: string): string | undefined {
    return term.length < this.minLength ? undefined : term;
  }
}

const constrains: Record<string, Type> = {
  'number': NumberComponentConstraint,
  'alpha': AlphaComponentConstraint,
  'maxlength': MaxlengthComponentConstraint,
  'minlength': MinlengthComponentConstraint,
  'alphanumeric': AlphanumericComponentConstraint,
};

export class DynamicPathComponent implements RoutePathComponent {
  private readonly _charList: readonly number[] = [];
  private readonly _minLength: number = -1;
  private readonly _maxLength: number = -1;

  constructor(
    readonly original: string,
    readonly name: string,
    readonly constraint?: DynamicComponentConstraint<unknown>
  ) {
    if (constraint) {
      if (constraint.charList && constraint.charList.length) {
        this._charList = constraint.charList;
      }

      if (constraint.minLength && constraint.minLength > -1) {
        this._minLength = constraint.minLength;
      }

      if (constraint.maxLength && constraint.maxLength > -1) {
        this._maxLength = constraint.maxLength;
      }
    }
  }

  tryLength(path: string): number {
    let length = 0;
    if (this._charList.length) {
      while (length < path.length) {
        if (!this._charList.includes(path.charCodeAt(length))) {
          break;
        }
        length++;
      }
    } else {
      while (length < path.length) {
        const char = path.charCodeAt(length);
        if (percent === char) {
          if ((length + 2) >= path.length) {
            throw new Error('URI malformed (Percent-Encoding). format: "%[\dA-Fa-f]{2,2}"');
          }

          if (
            !hexdig.includes(path.charCodeAt(length + 1)) ||
            !hexdig.includes(path.charCodeAt(length + 2))
          ) {
            throw new Error('URI malformed (Percent-Encoding) "%' + path[length + 1] + path[length + 2] + '"');
          }

          length += 2;
          continue;
        }

        if (!pchar.includes(char)) {
          break;
        }

        length++;
      }
    }

    if (this._minLength > -1 && length < this._minLength) {
      return 0; // return no length
    }

    if (this._maxLength > -1 && length > this._maxLength) {
      length = this._maxLength; // cut length and leave the rest for another node
    }

    return length;
  }

  match(term: string): unknown | undefined {
    return this.constraint ? this.constraint.match(term) : (term.length ? term : undefined);
  }

  equals(other: unknown): other is this {
    return other instanceof DynamicPathComponent && other.name === this.name; // check constraints
  }
}

export class CatchAllPathComponent implements RoutePathComponent {
  constructor(readonly original: string, readonly name?: string) {
  }

  equals(other: unknown): other is this {
    return other instanceof CatchAllPathComponent && other.name === this.name;
  }
}

export function segmentRoutePath(path: string): RoutePathComponent[][] {
  let buffer = '';
  let segment: RoutePathComponent[] = [];
  const result = [];

  const clear = (i: number): number => {
    while (i < path.length) { // clear whitespaces
      if (!whitespace.includes(path.charCodeAt(i))) {
        break;
      }
      i++;
    }
    return i;
  };

  while (path.length) {
    let length = 1;
    const first = path.charCodeAt(0);

    if (first === slash) { // break
      if (buffer.length) {
        segment.push(new StaticPathComponent(buffer));
        buffer = '';
      }
      if (segment.length) {
        result.push(segment);
        segment = []; // add new segment
      }
    } else if (first === backslash) { // isolate
      if (path.length < 2) {
        throw new Error('backslash cannot be the last character in path.');
      }
      length++;
      if (![colon, asterisk].includes(path.charCodeAt(1))) {
        throw new Error('character isolation works for ":" and "+" only, to skip component identification');
      }
      buffer += path[1];
    } else if (first === colon) { // param logic
      if (buffer.length) { // flush text segment
        segment.push(new StaticPathComponent(buffer));
        buffer = '';
      }

      let i = 1;
      i = clear(i);
      if (i >= path.length) {
        throw new Error('colon cannot be the last character in path.');
      }
      if (!variable.first.includes(path.charCodeAt(i))) {
        throw new Error('bad param first character "' + path[i] + '". allowed: alpha, "$", "_".');
      }
      let paramname = '';
      while (i < path.length) {
        if (!variable.any.includes(path.charCodeAt(i))) {
          break;
        }
        paramname += path[i];
        i++;
      }
      i = clear(i);
      let constraint;
      if (i < path.length && equal === path.charCodeAt(i)) { // aspnet insipired constraints
        i++;
        if (i >= path.length) {
          throw new Error('constraint is empty in the end of the line. revise the path.');
        }
        i = clear(i);
        if (!variable.first.includes(path.charCodeAt(i))) {
          throw new Error('bad constraint first character "' + path[i] + '". allowed: alpha, "$", "_".');
        }
        let constraintname = '';
        while (i < path.length) {
          if (!variable.any.includes(path.charCodeAt(i))) {
            break;
          }
          constraintname += path[i];
          i++;
        }
        i = clear(i);
        let args: string[] = [];
        if (i < path.length && parentheses1 === path.charCodeAt(i)) {
          i++;
          let closed = false;
          let arg = '';
          while (i < path.length) {
            if (backslash === path.charCodeAt(i)) {
              i++;
            } else if (comma === path.charCodeAt(i)) { // break arg
              if (arg.length) {
                args.push(arg);
                arg = '';
              }
              i++;
              continue;
            } else if (parentheses2 === path.charCodeAt(i)) {
              // close bracket
              closed = true;
              break;
            }

            arg += path[i];
            i++;
          }
          if (arg.length) {
            args.push(arg);
            arg = '';
          }
          if (!closed) {
            throw new Error('parentheses is not closed. revise the path.');
          }
          i = clear(i);

        } else {
          i--;
        }
        if (constraintname in constrains) {
          constraint = new (constrains[constraintname] as unknown as Type)(...args);
        } else {
          throw new Error('unknown param constraint "' + constraintname + '"');
        }
      } else {
        i--;
      }
      length += i;
      segment.push(new DynamicPathComponent(path.substring(0, length), paramname, constraint));
    } else if (first === asterisk) { // catch-all
      if (buffer.length) { // flush text segment
        segment.push(new StaticPathComponent(buffer));
        buffer = '';
      }
      let i = clear(1);
      if (i < path.length && path.charCodeAt(1) === asterisk) {
        i++; // 2nd asterix
      }
      i = clear(i);
      if (i < path.length && !variable.first.includes(path.charCodeAt(i))) {
        throw new Error('named catch start character incorrect "' + path[i] + '". allowed: alpha, "$", "_".');
      }
      let paramname = '';
      while (i < path.length && variable.any.includes(path.charCodeAt(i))) {
        paramname += path[i];
        i++;
      }
      i = clear(i);
      if (i < path.length) {
        throw new Error('catch is always the last component. revise the path.');
      }
      segment.push(new CatchAllPathComponent(path.substring(0, length), paramname.length ? paramname : undefined));
      length += i;
    } else { // add to segment
      buffer += path[0];
    }

    path = path.substring(length); // cut the path
  }

  if (buffer.length) {
    segment.push(new StaticPathComponent(buffer));
  }

  if (segment.length) {
    result.push(segment);
  }

  return result;
}
