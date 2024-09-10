export type MaybePromise<T> = PromiseLike<T> | T;

// todo: add cancellation
export namespace MaybePromise {
  class ResultHandler<T> {
    private _canceled = false;

    constructor(
      readonly initialResult: MaybePromise<T>,
      readonly onResult: (value: T) => void,
      readonly onError: (err: unknown) => void,
    ) {
      this._innerHandler(initialResult);
    }

    private _innerHandler(result: MaybePromise<T>): void {
      if (
        result instanceof Promise ||
        (
          (typeof result === 'object' || typeof result === 'function') &&
          result !== null &&
          'then' in result &&
          typeof result.then === 'function'
        )
      ) {
        (result.then as Function)((result2: MaybePromise<T>) => this._innerHandler(result2), (err: unknown) => {
          this._canceled = true;
          this.onError(err);
        });
      } else {
        this.onResult(result as T);
      }
    }

    cancel(): void {
      this._canceled = true;
    }
  }

  const rethrowError: (err: unknown) => void = err => {
    throw err;
  };

  export function then<T>(callback: () => MaybePromise<T>, onResult: (value: T) => void, onError: (err: unknown) => void = rethrowError): void {
    try {
      new ResultHandler(callback(), onResult, onError);
    } catch (err) {
      onError(err);
    }
  }

  export function all(callback: () => MaybePromise<unknown>[], onResult: (values: unknown[]) => void, onError: (err: unknown) => void = rethrowError): void {
    let results: MaybePromise<unknown>[];
    try {
      results = callback();
    } catch (err) {
      onError(err);
      return;
    }

    if (!results.length) {
      onResult([]);
      return;
    }

    const results2 = new Array(results.length);
    let processed = 0;

    const handlers = results.map((result, index) => {
      return new ResultHandler(result, result2 => {
        results2[index] = result2;
        processed++;
        if (processed === results.length) {
          onResult(results2);
        }
      }, err => {
        handlers.forEach(handler => handler.cancel());
        onError(err);
      });
    });
  }
}
