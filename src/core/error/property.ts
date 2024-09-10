export class PropertyNotFoundError implements Error {
  readonly name = 'PropertyNotFoundError';

  constructor(
    readonly message = 'Property is not found',
  ) { }
}

export function propertyNotFound(message?: string): PropertyNotFoundError {
  return new PropertyNotFoundError(message);
}
