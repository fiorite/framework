import { arraySequenceEqual, Type, utf16, Utf16Sequence } from '../core';

export interface RouteParameterConstraint<T = string> {
  readonly name: string;
  readonly whitelist?: Utf16Sequence;
  readonly minLength?: number;
  readonly maxLength?: number;

  /**
   * {@link term} validation results into <T> value, otherwise returns undefined.
   */
  match(term: string): T | undefined;
}

export interface RouteParameterConstraintConstructor {
  new<T>(...args: string[]): RouteParameterConstraint<T>;
}

export class NumberParameterConstraint implements RouteParameterConstraint<number> {
  readonly name: string = 'number';
  readonly whitelist = new Utf16Sequence([...utf16.digit, utf16.ascii['.']]); // todo: add local length test

  match(term: string): number | undefined {
    let index = -1;
    const dots = [];
    while (true) {
      index = term.indexOf('.', index + 1);
      if (index < 0) {
        break;
      }
      dots.push(index);
    }

    if (dots.length > 1) {
      return undefined;
    }

    const number = Number(term);
    return Number.isNaN(number) ? undefined : number;
  }
}

export class IntegerParameterConstraint implements RouteParameterConstraint<number> {
  readonly name: string = 'integer';
  readonly whitelist = utf16.digit; // todo: add local length test

  match(term: string): number | undefined {
    const number = Number(term);
    return Number.isNaN(number) ? undefined : number;
  }
}

export class BooleanParameterConstraint implements RouteParameterConstraint<boolean> {
  readonly name = 'boolean';
  readonly whitelist = utf16.alpha;
  readonly minLength = 4; // true
  readonly maxLength = 5; // false

  match(term: string): boolean | undefined {
    term = term.toLowerCase();
    if ('true' === term) {
      return true;
    }
    if ('false' === term) {
      return false;
    }
    return undefined;
  }
}

export class AlphaParameterConstraint implements RouteParameterConstraint {
  readonly name = 'alpha';
  readonly whitelist = utf16.alpha;

  match(term: string): string | undefined {
    if (!term.length) {
      return undefined;
    }
    let i = 0;
    while (i < term.length) {
      if (!this.whitelist.includes(term.charCodeAt(i))) {
        return undefined;
      }
      i++;
    }
    return term;
  }
}

export class AlphanumericParameterConstraint implements RouteParameterConstraint {
  readonly name = 'alphanumeric';
  readonly whitelist = utf16.alphanumeric;

  match(term: string): string | undefined {
    if (!term.length) {
      return undefined;
    }
    let i = 0;
    while (i < term.length) {
      if (!this.whitelist.includes(term.charCodeAt(i))) {
        return undefined;
      }
      i++;
    }
    return term;
  }
}

export class MaxlengthParameterConstraint implements RouteParameterConstraint {
  readonly name = 'maxlength';
  readonly maxLength: number;

  constructor(value: number);
  constructor(arg: unknown) {
    const number = Number(arg);
    if (Number.isNaN(number)) {
      throw new Error('invalid constraint argument: maxlength(value: number)');
    }
    this.maxLength = number;
  }

  match(term: string): string | undefined {
    return term.length > this.maxLength ? undefined : term;
  }
}

export class MinlengthParameterConstraint implements RouteParameterConstraint {
  readonly name = 'minlength';
  readonly minLength: number;

  constructor(number: number);
  constructor(arg: unknown) {
    const number = Number(arg);
    if (Number.isNaN(number)) {
      throw new Error('invalid constraint argument: minlength(value: number)');
    }
    this.minLength = number;
  }

  match(term: string): string | undefined {
    return term.length < this.minLength ? undefined : term;
  }
}

export class UuidParameterConstraint implements RouteParameterConstraint {
  readonly name = 'uuid';
  readonly whitelist = new Utf16Sequence([...utf16.hexdigit, utf16.ascii['-']]);
  readonly minLength = 36;
  readonly maxLength = 36;

  match(term: string): string | undefined {
    const hyphens = [8, 13, 18, 23];

    let index = -1;
    const hits = [];
    while (true) {
      index = term.indexOf('-', index + 1);
      if (index < 0) {
        break;
      }
      hits.push(index);
    }

    return arraySequenceEqual(hits, hyphens) ? term : undefined;
  }
}

export class LengthParameterConstraint implements RouteParameterConstraint {
  readonly name = 'length';
  readonly minLength: number;
  readonly maxLength: number;

  constructor(length: number);
  constructor(min: number, max: number);
  constructor(...args: unknown[]) {
    if (1 === args.length) {
      const length = Number(args[0] as number);
      if (Number.isNaN(length)) {
        throw new Error('invalid constraint argument length(length: number)');
      }
      this.minLength = length;
      this.maxLength = length;
      return;
    }

    if (2 === args.length) {
      const min = Number(args[0] as number);
      const max = Number(args[1] as number);

      if (Number.isNaN(min) || Number.isNaN(max)) {
        throw new Error('invalid constraint arguments: length(min: number, max: number)');
      }

      this.minLength = args[0] as number;
      this.maxLength = args[0] as number;
      return;
    }

    throw new Error('length constraint bad arguments number.');
  }

  match(term: string): string | undefined {
    return term.length < this.minLength || term.length > this.maxLength ? undefined : term;
  }
}

export class MinParameterConstraint extends NumberParameterConstraint {
  override readonly name = 'min';

  readonly value: number;

  constructor(value: number);
  constructor(arg: unknown) {
    super();
    const value = Number(arg);
    if (Number.isNaN(value)) {
      throw new Error('invalid constraint arguments: max(value: number)');
    }
    this.value = value;
  }

  override match(term: string): number | undefined {
    const value = super.match(term);
    return undefined === value || value < this.value ? undefined : value;
  }
}

export class MaxParameterConstraint extends NumberParameterConstraint {
  override readonly name = 'max';

  readonly value: number;

  constructor(value: number);
  constructor(arg: unknown) {
    super();
    const value = Number(arg);
    if (Number.isNaN(value)) {
      throw new Error('invalid constraint arguments: max(value: number)');
    }
    this.value = value;
  }

  override match(term: string): number | undefined {
    const value = super.match(term);
    return undefined === value || value > this.value ? undefined : value;
  }
}

export class RangeParameterConstraint extends NumberParameterConstraint {
  override readonly name = 'range';

  readonly min: number;
  readonly max: number;

  constructor(min: number, max: number);
  constructor(arg1: unknown, arg2: number) {
    super();
    const min = Number(arg1);
    const max = Number(arg2);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      throw new Error('invalid constraint arguments: range(min: number, max: number)');
    }
    if (min > max) {
      throw new Error('invalid constraint arguments: min should be > than max ('+arg1+' and '+arg2+')');
    }
    this.min = min;
    this.max = max;
  }

  override match(term: string): number | undefined {
    const value = super.match(term);
    return undefined === value || value < this.min || value > this.max ? undefined : value;
  }
}

/** @deprecated should be tested properly */
export class RegexpParameterConstraint implements RouteParameterConstraint {
  readonly name = 'regexp';
  private _regexp: RegExp;

  constructor(readonly pattern: string) {
    this._regexp = new RegExp(pattern);
  }

  match(term: string): string | undefined {
    const match = this._regexp.exec(term);
    return null === match ? undefined : match[0];
  }
}

export const routeParameterConstrains: Record<string, Type> = {
  'number': NumberParameterConstraint,
  'integer': IntegerParameterConstraint,
  'int': IntegerParameterConstraint, // alias
  'boolean': BooleanParameterConstraint,
  'alpha': AlphaParameterConstraint,
  'alphanumeric': AlphanumericParameterConstraint,
  'uuid': UuidParameterConstraint,
  'minlength': MinlengthParameterConstraint,
  'maxlength': MaxlengthParameterConstraint,
  'length': LengthParameterConstraint,
  'min': MinParameterConstraint,
  'max': MaxParameterConstraint,
  'range': RangeParameterConstraint,
  'regexp': RegexpParameterConstraint,
};
