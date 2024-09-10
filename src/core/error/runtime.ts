export class NotImplementedError implements Error {
    name = 'NotImplementedError';
    message = 'Method or function is not implemented.';
}

export function notImplemented(): NotImplementedError {
  return new NotImplementedError();
}
