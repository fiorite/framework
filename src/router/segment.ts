import { Type, utf16, Utf16Sequence } from '../core';
import { CatchAllRouteComponent, ParameterRouteComponent, RouteComponent, StaticRouteComponent } from './component';
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

/**
 *
 */
const kchar = new Utf16Sequence([utf16.ascii[':'], utf16.ascii['*']]);

export function segmentRoutePath(path: string): RouteComponent[][] {
  let buffer = '';
  let segment: RouteComponent[] = [];
  const result = [];

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
      const component = new StaticRouteComponent(buffer);
      segment.push(component);
      buffer = '';
    }
  };

  while (path.length) {
    let length = 1;
    const first = path.charCodeAt(0);

    if (first === utf16.ascii['/']) { // break
      flush();
      if (segment.length) {
        result.push(segment);
        segment = []; // add new segment
      }
    } else if (first === utf16.ascii['\\']) { // isolate
      if (path.length < 2) {
        throw new Error('backslash cannot be the last character in path.');
      }
      length++;
      if (!kchar.includes(path, 1)) { // replace
        throw new Error('character isolation works for ":" and "+" only, to skip component identification');
      }
      buffer += path[1];
    } else if (first === utf16.ascii[':']) { // param logic
      flush(); // flush text segment
      let i = 1;
      i = clear(i);
      if (i >= path.length) {
        throw new Error('colon cannot be the last character in path.');
      }
      if (!utf16.variable.start.includes(path, i)) {
        throw new Error('bad param first character "' + path[i] + '". allowed: alpha, "$", "_".');
      }
      let paramname = '';
      while (i < path.length) {
        if (!utf16.variable.continue.includes(path, i)) {
          break;
        }
        paramname += path[i];
        i++;
      }
      i = clear(i);
      let constraint;
      if (i < path.length && utf16.ascii['='] === utf16.at(path, i)) { // aspnet insipired constraints
        i++;
        if (i >= path.length) {
          throw new Error('constraint is empty in the end of the line. revise the path.');
        }
        i = clear(i);
        if (!utf16.variable.start.includes(path, i)) {
          throw new Error('bad constraint first character "' + path[i] + '". allowed: alpha, "$", "_".');
        }
        let constraintname = '';
        while (i < path.length) {
          if (!utf16.variable.continue.includes(path, i)) {
            break;
          }
          constraintname += path[i];
          i++;
        }
        i = clear(i);
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
        if (constraintname in routeParameterConstrains) {
          constraint = new (routeParameterConstrains[constraintname] as unknown as Type)(...args);
        } else {
          throw new Error('unknown param constraint "' + constraintname + '"');
        }
      } else {
        i--;
      }
      length += i;
      segment.push(new ParameterRouteComponent(path.substring(0, length), paramname, constraint));
    } else if (first === utf16.ascii['*']) { // catch-all
      flush(); // flush text segment
      let i = clear(1);
      if (i < path.length && utf16.at(path, 1) === utf16.ascii['*']) {
        i++; // 2nd asterix
      }
      i = clear(i);
      if (i < path.length && !utf16.variable.start.includes(path, i)) {
        throw new Error('named catch start character incorrect "' + path[i] + '". allowed: alpha, "$", "_".');
      }
      let paramname = '';
      while (i < path.length && utf16.variable.continue.includes(path, i)) {
        paramname += path[i];
        i++;
      }
      i = clear(i);
      if (i < path.length) {
        throw new Error('catch is always the last component. revise the path.');
      }
      segment.push(new CatchAllRouteComponent(path.substring(0, length), paramname.length ? paramname : undefined));
      length += i;
    } else { // add to segment
      buffer += path[0];
    }

    path = path.substring(length); // cut the path
  }

  flush(); // flush text segment

  if (segment.length) {
    result.push(segment);
  }

  return result;
}
