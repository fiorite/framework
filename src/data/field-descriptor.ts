/** @deprecated experimental feature. there and issue with { ...object } and Object.assign(object, other). could be removed */
interface ModelFieldDescriptorOptions {
  readonly readonly?: boolean;
  readonly optional?: boolean;
}

/** @deprecated experimental feature. there and issue with { ...object } and Object.assign(object, other). could be removed */
export type ModelFieldDescriptor<T> = TypedPropertyDescriptor<T> | ModelFieldDescriptorOptions;

/** @deprecated experimental feature. there and issue with { ...object } and Object.assign(object, other). could be removed */
export function defineFieldDescriptor<T>(set: (value: unknown | undefined) => T, { optional: _optional, readonly: _readonly }: {
  readonly optional?: boolean;
  readonly readonly?: boolean;
} = {}): ModelFieldDescriptor<T> {
  let _value: T | undefined;

  let outer: (value: T | undefined) => void = value => _value = value;

  if (set) {
    const inner = outer;
    outer = value => inner(set(value));
  }

  if (!_optional) {
    const inner = outer;
    outer = value => {
      if (undefined === value || null === value) {
        throw new Error('model: value cannot be undefined or null.');
      }
      inner(value);
    };
  }

  if (_readonly) {
    const inner = outer;
    let set = false;
    outer = value => {
      if (set) {
        throw new Error('model: field is set already, unable to change it readonly.');
      }
      set = true;
      inner(value);
    };
  }

  // if (false) { // todo: add notifications
  //   const inner = outer;
  //   outer = value => {
  //     inner(value);
  //     console.log(`!model: value set: ${_value}`);
  //   }
  // }

  const _set: (value: T | undefined) => void = outer;

  const descriptor: ModelFieldDescriptor<T> = {
    get: () => {
      if (!_optional && undefined === _value) {
        throw new Error('#value is not set and #optional=true');
      }

      return _value!;
    },
    set: _set,
    configurable: true,
    enumerable: true,
  };

  if (_optional) {
    Object.assign(descriptor, { optional: _optional });
  }

  if (_readonly) {
    Object.assign(descriptor, { readonly: _readonly });
  }

  return descriptor;
}
