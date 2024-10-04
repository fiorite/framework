export class HttpBodyResult<T> {
  #completed = false;

  get completed(): boolean {
    return this.#completed;
  }

  #value?: T;

  get value(): T | undefined {
    return this.#value;
  }

  complete(value: T): void {
    if (this.#completed) {
      throw new Error('body is fulfilled already.');
    }
    this.#completed = true;
    this.#value = value;
  }
}
