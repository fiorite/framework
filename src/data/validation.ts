import { FunctionClass } from '../core';

export type ValidateFunction = (value: unknown) => boolean;

export class ObjectValidator<T> extends FunctionClass<ValidateFunction> {
  constructor(object: Record<keyof T, ValidateFunction>) {
    super(value => {
      if ('object' !== typeof value || null === value) {
        return false;
      }

      const keys1 = Object.keys(object);
      const keys2 = Object.keys(value as object);

      if (keys1.length !== keys2.length) {
        return false;
      }

      return keys1.every(key => {
        return key in value && (object as any)[key]((value as any)[key]);
      });
    });
  }
}

export class OptionalValidator extends FunctionClass<ValidateFunction> {
  constructor(other?: ValidateFunction) {
    super(
      other ? value => {
        return undefined === value || null === value ? true : other(value);
      } : value => undefined === value || null === value
    );
  }
}

export class NumberValidator extends FunctionClass<ValidateFunction> {
  constructor() {
    super(value => typeof value === 'number');
  }
}

export class StringValidator extends FunctionClass<ValidateFunction> {
  constructor() {
    super(value => typeof value === 'string');
  }
}

export class BooleanValidator extends FunctionClass<ValidateFunction> {
  constructor() {
    super(value => typeof value === 'boolean');
  }
}

export class RecordValidator extends FunctionClass<ValidateFunction> {
  constructor(key?: ValidateFunction, value?: ValidateFunction) {
    super(_value => {
      if ('object' !== typeof _value || null === _value) {
        return false;
      }

      if (key && !Object.keys(_value).every(x => key(x))) {
        return false;
      }

      if (value && !Object.values(_value).every(x => value(x))) {
        return false;
      }

      return true;
    });
  }
}

export class ArrayValidator extends FunctionClass<ValidateFunction> {
  constructor(of?: ValidateFunction) {
    super(of ? value => {
      return Array.isArray(value) && value.every(value1 => of(value1));
    } : value => Array.isArray(value));
  }
}

export class ValidatorBuilder {
  get number(): NumberValidator {
    return new NumberValidator();
  }

  get string(): StringValidator {
    return new StringValidator();
  }

  get boolean(): BooleanValidator {
    return new BooleanValidator();
  }

  object<T extends object>(object: Record<keyof T, ValidateFunction>): ObjectValidator<T> {
    return new ObjectValidator(object);
  }

  optional(other?: ValidateFunction): OptionalValidator {
    return new OptionalValidator(other);
  }

  record(key?: ValidateFunction, value?: ValidateFunction): RecordValidator {
    return new RecordValidator(key, value);
  }

  array(of?: ValidateFunction): ArrayValidator {
    return new ArrayValidator(of);
  }
}

export function makeValidator(configure: (builder: ValidatorBuilder) => ValidateFunction): ValidateFunction {
  return configure(new ValidatorBuilder());
}
