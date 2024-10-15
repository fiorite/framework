export class HttpBodyResult<T> {
  private _done = false;

  get done(): boolean {
    return this._done;
  }

  private _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  complete(value: T): void {
    if (this._done) {
      throw new Error('body is fulfilled already.');
    }
    this._done = true;
    this._value = value;
  }
}
