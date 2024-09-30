import { Equatable, utf16, Utf16Sequence } from '../core';
import { RouteParameterConstraint } from './constraint';

export abstract class RoutePathSegment implements Equatable {
  private readonly _value: string;

  get value(): string {
    return this._value;
  }

  protected constructor(value: string = '') {
    this._value = value || '';
  }

  abstract equals(other: unknown): other is this;
}

export class NullPathSegment extends RoutePathSegment {
  static readonly _instance = new NullPathSegment();

  static get instance(): NullPathSegment {
    return this._instance;
  }

  equals(other: unknown): other is this {
    return other instanceof NullPathSegment;
  }
}

export class StaticPathSegment extends RoutePathSegment {
  // get [Symbol.toStringTag](): string {
  //   return `StaticSegment: '${this.original}'`;
  // }

  constructor(value: string) {
    super(value);
  }

  equals(other: unknown): other is this {
    return other instanceof StaticPathSegment &&
      other.value === this.value;
  }
}

export class DynamicPathSegment extends RoutePathSegment {
  // add pct-encoded
  private static _pchar = new Utf16Sequence([
    ...utf16.alpha,
    ...utf16.digit,
    ...[
      // unreserved: ALPHA / DIGIT / "-" / "." / "_" / "~"
      '-', '.', '_', '~',

      // sub-delims: "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
      '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=',

      // ":" / "@"
      ':', '@',
    ].map(x => utf16.ascii[x]),
  ]);

  private readonly _name: string;

  get name(): string {
    return this._name;
  }

  private readonly _constraint?: RouteParameterConstraint;

  get constraint(): RouteParameterConstraint |undefined {
    return this._constraint;
  }

  private readonly _charList?: Utf16Sequence;
  private readonly _minLength: number = -1;
  private readonly _maxLength: number = -1;

  // private _constraintDelimited: ':' | '=';
  // private _catchSyntax: ':;' | '{}' = '{}';

  constructor(
    value: string,
    name: string,
    constraint?: RouteParameterConstraint
  ) {
    super(value);
    this._name = name;
    this._constraint = constraint;
    if (constraint) {
      if (constraint.whitelist && constraint.whitelist.length) {
        this._charList = constraint.whitelist;
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
    if (this.constraint && this.constraint.tryLength) {
      return this.constraint.tryLength(path);
    }

    let length = 0;
    if (this._charList) {
      while (length < path.length) {
        if (!this._charList.includes(path, length)) {
          break;
        }
        length++;
      }
    } else {
      while (length < path.length) {
        const char = path.charCodeAt(length);
        if (utf16.ascii['%'] === char) {
          if ((length + 2) >= path.length) {
            throw new Error('URI malformed (Percent-Encoding). format: "%[\dA-Fa-f]{2,2}"');
          }

          if (
            !utf16.hexdigit.includes(path.charCodeAt(length + 1)) ||
            !utf16.hexdigit.includes(path.charCodeAt(length + 2))
          ) {
            throw new Error('URI malformed (Percent-Encoding) "%' + path[length + 1] + path[length + 2] + '"');
          }

          length += 2;
          continue;
        }

        if (!DynamicPathSegment._pchar.includes(char)) {
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
    return other instanceof DynamicPathSegment &&
      other.name === this.name; // todo: check constraints
  }
}

enum SyntaxType {
  Colon,
}

export class CatchAllPathSegment extends RoutePathSegment {
  private readonly _name?: string;

  get name(): string | undefined {
    return this._name;
  }

  constructor(value: string, name?: string) {
    super(value);
    this._name = name;
  }

  equals(other: unknown): other is this {
    return other instanceof CatchAllPathSegment && other.name === this.name;
  }
}
