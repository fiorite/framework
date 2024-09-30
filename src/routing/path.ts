import { Type, utf16, Utf16Sequence } from '../core';
import { CatchAllPathSegment, DynamicPathSegment, RoutePathSegment, StaticPathSegment } from './segment';
import { routeParameterConstrains } from './constraint';

// * or ** = catch all in aspnet core. catch-all is last param, cannot have anything in front of it.
// other than that
// 1. parse segments
// 2. matcher receives
// radix tree gets string prefix,
/**
 * router handle string, dynamic param and catch-the-rest (catch-all), astrix
 * regular parameters gated within segment. one segment can have couple parameters
 * parameter matcher might provide char[] list, if list is empty = only one parameter required per segment to avoid collision.

 * path          = path-abempty    ; begins with "/" or is empty
 *                     / path-absolute   ; begins with "/" but not "//"
 *                     / path-noscheme   ; begins with a non-colon segment
 *                     / path-rootless   ; begins with a segment
 *                     / path-empty      ; zero characters
 *
 *       path-abempty  = *( "/" segment )
 *       path-absolute = "/" [ segment-nz *( "/" segment ) ]
 *       path-noscheme = segment-nz-nc *( "/" segment )
 *       path-rootless = segment-nz *( "/" segment )
 *       path-empty    = 0<pchar>
 *
 *  segment       = *pchar
 *       segment-nz    = 1*pchar
 *       segment-nz-nc = 1*( unreserved / pct-encoded / sub-delims / "@" )
 *                     ; non-zero-length segment without any colon ":"
 *
 *       pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *
 * pct-encoded = "%" HEXDIG HEXDIG
 *  sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
 *                   / "*" / "+" / "," / ";" / "="
 * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * gen-delims = ":" / "/" / "?" / "#" / "[" / "]" / "@"
 *
 */

const kchar = new Utf16Sequence([
  utf16.ascii[':'], // angular/express like routing
  utf16.ascii['{'], // laravel/asp.net like routing
  utf16.ascii['*'], // catch-all
]);

// ? or # are break

const isDigitString = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  let i = 0;
  while (i < value.length) {
    if (!utf16.digit.includes(value, i)) {
      return false;
    }
    i++;
  }
  return true;
};

export class RoutePath implements ArrayLike<RoutePathSegment>, Iterable<RoutePathSegment> {
  private readonly _value: string;

  get value(): string {
    return this._value;
  }

  get [Symbol.toStringTag](): string {
    return 'RoutePath';
  }

  private _data: RoutePathSegment[] = [];

  readonly [n: number]: RoutePathSegment;

  get length(): number {
    return this._data.length;
  }

  constructor(path: string) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    let buffer = '';

    const clear = (i: number): number => {
      while (i < path.length) { // clear whitespaces
        if (!utf16.whitespace.includes(path, i)) {
          break;
        }
        i++;
      }
      return i;
    };

    const flush = () => {
      if (buffer.length) {
        const component = new StaticPathSegment(buffer);
        this._data.push(component);
        buffer = '';
      }
    };

    const varname = (substr: string, pos: number, optional = false): string => {
      if (!utf16.variable.start.includes(substr, pos)) {
        if (!optional) {
          throw new Error('bad param first character "' + substr[pos] + '". allowed: [A-Za-z_$]+.');
        }
        return '';
      }
      let name = '';
      while (pos < substr.length) {
        if (!utf16.variable.continue.includes(substr, pos)) {
          break;
        }
        name += substr[pos];
        pos++;
      }
      return name;
    };

    while (path.length) {
      let length = 1;
      const char = utf16.at(path, 0);

      if (char === utf16.ascii['/']) { // "/" segment break, todo: make
        buffer += path[0];
        while (utf16.ascii['/'] === utf16.at(path, length)) {
          length++;
        }
      } else if (char === utf16.ascii['\\']) { // jump to next char
        if (path.length < 2) {
          throw new Error('backslash cannot be the last character in path.');
        }
        length++;
        if (!kchar.includes(path, 1)) { // replace
          throw new Error('character isolation works for ":", "{" and "+" only. not "' + path[1] + '"');
        }
        buffer += path[1];
      } else if (utf16.ascii[':'] === char) { // express, angular like param logic
        flush(); // flush text segment
        let i = clear(1);
        if (i >= path.length) {
          throw new Error('colon cannot be the last character in path.');
        }
        let paramname = varname(path, i);
        if (!paramname.length) {
          throw new Error('parameter name cannot be empty string after ":..."');
        }
        i = clear(i + paramname.length);
        let constraint;
        if (i < path.length && utf16.ascii[';'] !== utf16.at(path, i)) {
          if (utf16.ascii['='] === utf16.at(path, i)) { // aspnet inspired constraints
            i++;
            if (i >= path.length) {
              throw new Error('constraint is empty in the end of the line. revise the path.');
            }
            i = clear(i);
            let constraintname = varname(path, i);
            if (!constraintname.length) {
              throw new Error('constraint name cannot be empty string after ":param=..."');
            }
            i = clear(i + constraintname.length);
            let args: string[] = [];
            if (i < path.length && utf16.ascii[';'] !== utf16.at(path, i)) {
              if (i < path.length && utf16.ascii[';'] !== utf16.at(path, i) && utf16.ascii['('] === utf16.at(path, i)) {
                i++;
                let closed = false;
                let arg = '';
                while (i < path.length) {
                  // if (utf16.code['\\'] === utf16.at(path, i)) {
                  //   i++;
                  // } else
                  if (utf16.ascii[','] === utf16.at(path, i)) { // break arg
                    if (arg.length) {
                      args.push(arg);
                      arg = '';
                    }
                    i++;
                    continue;
                  } else if (utf16.ascii[')'] === utf16.at(path, i)) {
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
                if (utf16.ascii[';'] !== utf16.at(path, i)) {
                  i--;
                }
              } else {
                i--;
              }
            }
            if (constraintname in routeParameterConstrains) {
              constraint = new (routeParameterConstrains[constraintname] as unknown as Type)(...args);
            } else {
              throw new Error('unknown param constraint "' + constraintname + '"');
            }
          } else {
            i--;
          }
        }
        length += i;
        this._data.push(new DynamicPathSegment(path.substring(0, length), paramname, constraint));
      } else if (utf16.ascii['{'] === char) { // laravel/asp.net like routing param
        flush(); // flush text segment
        let i = clear(1); // skip whitespace after "{"
        if (i >= path.length) {
          throw new Error('curly bracket open cannot be the last character in path.');
        }
        if (utf16.ascii['*'] === utf16.at(path, i)) { // catch-all
          i = clear(i + 1);
          if (utf16.ascii['*'] === utf16.at(path, i)) { // handle double **
            i = clear(i + 1);
          }
          let paramname = varname(path, i, true);
          i = clear(i + paramname.length);
          if (utf16.ascii['}'] !== utf16.at(path, i)) {
            throw new Error('curly bracket should be closed after parameter definition "{**[param]}".');
          }
          i = clear(i + 1);
          if (i < path.length) {
            throw new Error('catch is always the last component. revise the path.');
          }
          length += i;
          this._data.push(new CatchAllPathSegment(path.substring(0, length), paramname.length ? paramname : undefined));
        } else { // regular parameter
          let paramname = varname(path, i);
          if (!paramname.length) {
            throw new Error('parameter name cannot be empty string in "{...}"');
          }
          i = clear(i + paramname.length);
          let constraint;
          if (i < path.length || (utf16.ascii[':'] === utf16.at(path, i) || utf16.ascii['='] === utf16.at(path, i))) { // constraint definition
            i++;
            if (i >= path.length) {
              throw new Error('constraint is empty in the end of the line "{param:". revise the path.');
            }
            i = clear(i);
            let constraintname = varname(path, i);
            if (!constraintname.length) {
              throw new Error('constraint name cannot be empty string after "{param:..."');
            }
            i = clear(i + constraintname.length);
            let args: string[] = [];
            if (i < path.length && utf16.ascii['('] === utf16.at(path, i)) {
              i++;
              let closed = false;
              let arg = '';
              while (i < path.length) {
                // if (utf16.code['\\'] === utf16.at(path, i)) {
                //   i++;
                // } else
                if (utf16.ascii[','] === utf16.at(path, i)) { // break arg
                  if (arg.length) {
                    args.push(arg);
                    arg = '';
                  }
                  i++;
                  continue;
                } else if (utf16.ascii[')'] === utf16.at(path, i)) {
                  // close bracket
                  closed = true;
                  i++;
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
            }
            if (constraintname in routeParameterConstrains) {
              constraint = new (routeParameterConstrains[constraintname] as unknown as Type)(...args);
            } else {
              throw new Error('unknown param constraint "' + constraintname + '"');
            }
          }
          if (i >= path.length || utf16.ascii['}'] !== utf16.at(path, i)) {
            throw new Error('curly bracket should be closed after parameter definition "{param}".');
          }
          length += i;
          this._data.push(new DynamicPathSegment(path.substring(0, length), paramname, constraint));
        }
      } else if (char === utf16.ascii['*']) { // catch-all
        flush(); // flush text segment
        let i = clear(1);
        if (i < path.length && utf16.at(path, 1) === utf16.ascii['*']) {
          i++; // 2nd asterix
        }
        i = clear(i);
        let paramname = varname(path, i, true);
        i = clear(i + paramname.length);
        if (i < path.length) {
          throw new Error('catch is always the last component. revise the path.');
        }
        length += i;
        this._data.push(new CatchAllPathSegment(path.substring(0, length), paramname.length ? paramname : undefined));
      } else { // add to segment
        buffer += path[0];
      }

      path = path.substring(length); // cut the path
    }

    flush(); // flush text segment

    this._value = this._data.reduce((result, component) => result + component.value, '');

    return new Proxy(this, {
      get: (target: RoutePath, p: string | symbol): any => {
        return isDigitString(p) ? (target._data as any)[Number(p)] : (target as any)[p];
      }
    });
  }

  [Symbol.iterator](): Iterator<RoutePathSegment> {
    return this._data[Symbol.iterator]();
  }

  toString(): string {
    return this._data.reduce((result, component) => result + component.value, '');
  }
}
