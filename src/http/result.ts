export class HttpBodyResult<T> {
  private _fulfilled = false;

  private _value?: T;

  get value(): T | undefined {
    return this._value;
  }

  fulfill(value: T): void {
    if (this._fulfilled) {
      throw new Error('body is fulfilled already.');
    }
    this._fulfilled = true;
    this._value = value;
  }
}
