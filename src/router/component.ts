import { RouteParameterConstraint } from './constraint';
import { utf16, Utf16Sequence } from '../core';

export interface RouteComponent {
  readonly original?: string;

  equals(other: unknown): other is this;
}

export class NullRouteComponent implements RouteComponent {
  equals(other: unknown): other is this {
    return other instanceof NullRouteComponent;
  }
}

export class StaticRouteComponent implements RouteComponent {
  constructor(readonly original: string) {
  }

  equals(other: unknown): other is this {
    return other instanceof StaticRouteComponent && other.original === this.original;
  }
}

// add pct-encoded
const pchar = new Utf16Sequence([
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


export class ParameterRouteComponent implements RouteComponent {
  private readonly _charList?: Utf16Sequence;
  private readonly _minLength: number = -1;
  private readonly _maxLength: number = -1;

  constructor(
    readonly original: string,
    readonly name: string,
    readonly constraint?: RouteParameterConstraint
  ) {
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
    return other instanceof ParameterRouteComponent && other.name === this.name; // todo: check constraints
  }
}

export class CatchAllRouteComponent implements RouteComponent {
  constructor(readonly original: string, readonly name?: string) {
  }

  equals(other: unknown): other is this {
    return other instanceof CatchAllRouteComponent && other.name === this.name;
  }
}
