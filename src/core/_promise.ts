// export class PromiseAlikeCanceledError implements Error {
//   readonly name = 'PromiseAlikeCanceledError';
//   readonly message = 'PromiseAlike was canceled.';
// }
//
// export class PromiseAlikeFulfilledError implements Error {
//   readonly name = 'PromiseAlikeFulfilledError';
//   readonly message = 'PromiseAlike was fulfilled.';
// }
//
// export class PromiseAlikeProtectedError implements Error {
//   readonly name = 'PromiseAlikeProtectedError';
//   readonly message = 'PromiseAlike is protected. Unable to #fulfill() it twice.';
// }


// /**
//  * experimental alternative to {@link Promise} in order to connect callbacks.
//  */
// export class PromiseAlike<T> implements PromiseLike<T> {
//   /**
//    * lock functional, blocks another call of {@link fulfill}.
//    * @private
//    */
//   #protected?: boolean;
//
//   #fulfilled?: boolean;
//
//   /**
//    * tells whether instance is completed.
//    */
//   get fulfilled(): boolean | undefined {
//     return this.#fulfilled;
//   }
//
//   #value?: T;
//
//   /**
//    * provides a value which become shared after
//    */
//   get value(): T | undefined {
//     return this.#value;
//   }
//
//   #canceled?: boolean;
//
//   get canceled(): boolean | undefined {
//     return this.#canceled;
//   }
//
//   #listeners?: Set<ValueCallback<T | undefined>>;
//
//   static value<T>(value: T): PromiseAlike<T> {
//     return new PromiseAlike<T>(fulfill => fulfill(value));
//   }
//
//   constructor(callback?: (this: PromiseAlike<T>, fulfill: ValueCallback<T | PromiseLike<T>>) => void) {
//     if (callback) {
//       callback.call(this, this.fulfill.bind(this));
//     }
//   }
//
//   #ensureNotCanceled(): void {
//     if (this.#canceled) {
//       throw new PromiseAlikeCanceledError();
//     }
//   }
//
//   fulfill(value: T | PromiseLike<T>): void {
//     this.#ensureNotCanceled();
//     if (this.#protected) {
//       throw new PromiseAlikeProtectedError();
//     }
//
//     this.#protected = true;
//
//     return MaybePromiseLike.then(() => value, resolved => {
//       this.#ensureNotCanceled();
//       this.#fulfilled = true;
//       this.#value = resolved;
//       this.#completeListeners(resolved);
//     }, err => {
//       // todo: fail
//     });
//   }
//
//   #ensureNotFulfilled(): void {
//     if (this.#fulfilled) {
//       throw new PromiseAlikeFulfilledError();
//     }
//   }
//
//   cancel(): void {
//     this.#ensureNotFulfilled();
//     this.#canceled = true;
//     this.#completeListeners(void 0);
//   }
//
//   #addListener(callback: ValueCallback<T | undefined>): void {
//     if (!this.#listeners) {
//       this.#listeners = new Set();
//     }
//     this.#listeners.add(callback);
//   }
//
//   #completeListeners(value?: T): void {
//     if (this.#listeners) {
//       this.#listeners.forEach(callback => callback(value));
//       this.#listeners.clear();
//       this.#listeners = undefined;
//     }
//   }
//
//   then<R = T>(callback?: MapCallback<T, MaybePromiseLike<R>>): PromiseLike<R>;
//   then<R = T>(callback?: MapCallback<T, MaybePromiseLike<R>>, onrejected?: ValueCallback<unknown>): PromiseLike<R> {
//     this.#ensureNotCanceled();
//
//     if (!callback) {
//       return this as PromiseLike<R>;
//     }
//
//     if (this.#fulfilled) {
//       return new PromiseAlike(fulfill => fulfill(callback(this.value!)));
//     }
//
//     if (onrejected) {
//       const source = this;
//       return new PromiseAlike(function (this) {
//         source.#addListener(value => {
//           if (source.canceled) {
//             onrejected(new PromiseAlikeCanceledError());
//             this.cancel();
//             return;
//           }
//           this.fulfill(callback(value as T));
//         });
//       });
//     }
//
//     return new Promise((resolve, reject) => { // fallback to Promise to handle #cancel()
//       this.#addListener(value => {
//         this.canceled ? reject(new PromiseAlikeCanceledError()) :
//           resolve(callback(value!));
//       });
//     });
//   }
// }
//
// /** @deprecated should be refactored to be a real promise since most places implement default callback signature.
//  * {@link Promise} is fallback to async/await for the best development experience. */
// export class PromiseAlike<T> implements PromiseLike<T> {
//   static value<T>(value: T): PromiseAlike<T> {
//     return new PromiseAlike(complete => complete(value));
//   }
//
//   static error(error: unknown): PromiseAlike<never> {
//     return new PromiseAlike((_, fail) => fail(error));
//   }
//
//   #state?: 'in-progress' | 'completed' | 'failed' | 'canceled';
//
//   get completed(): boolean {
//     return 'completed' === this.#state;
//   }
//
//   get canceled(): boolean {
//     return 'canceled' === this.#state;
//   }
//
//   get failed(): boolean {
//     return 'failed' === this.#state;
//   }
//
//   #value?: T;
//   #error?: unknown;
//   #events = new EventEmitter();
//
//   // #listeners?: Set<{ complete: ValueCallback<T | PromiseLike<T>>, fail: ValueCallback<unknown | void> }>;
//
//   constructor(callback?: (this: PromiseAlike<T>, complete: ValueCallback<T | PromiseLike<T>>, fail: ValueCallback<unknown | void>) => void) {
//     if (callback) {
//       try {
//         callback.call(this, this.complete.bind(this), this.fail.bind(this));
//       } catch (error) {
//         console.log(error);
//         this.fail(error);
//       }
//     }
//   }
//
//   complete(value: T | PromiseLike<T>): void {
//     if (undefined !== this.#state) {
//       throw new Error('busy.');
//     }
//     this.#state = 'in-progress';
//
//     MaybePromiseLike.then(() => value, value2 => {
//       if ('canceled' !== this.#state) {
//         this.#value = value2;
//         this.#state = 'completed';
//         this.#events.emit('complete', value2);
//       }
//     }, error => this.fail(error));
//   }
//
//   on(event: 'complete', callback: ValueCallback<T>): this;
//   on(event: 'fail', callback: ValueCallback<unknown | void>): this;
//   on(event: 'cancel', callback: ValueCallback<void>): this;
//   on(event: string, callback: Function): this {
//     if (undefined !== this.#state && 'in-progress' !== this.#state) {
//       throw new Error('completed, failed or canceled.');
//     }
//
//     this.#events.once(event, callback as any);
//     return this;
//   }
//
//   once(event: 'complete', callback: ValueCallback<T>): this;
//   once(event: 'fail', callback: ValueCallback<unknown | void>): this;
//   once(event: 'cancel', callback: ValueCallback<void>): this;
//   once(event: string, callback: Function): this {
//     if (undefined !== this.#state && 'in-progress' !== this.#state) {
//       throw new Error('completed, failed or canceled.');
//     }
//
//     this.#events.once(event, callback as any);
//     return this;
//   }
//
// //   on('fail', ValueCallback<>): void {
// //
// // }
//
//   fail(error?: unknown): void {
//     if (undefined !== this.#state && 'in-progress' !== this.#state) {
//       throw new Error('busy.');
//     }
//
//     this.#error = error;
//     this.#state = 'failed';
//     this.#events.emit('fail', error);
//   }
//
//   cancel(): void {
//     if (undefined !== this.#state && 'in-progress' !== this.#state) {
//       throw new Error('busy.');
//     }
//
//     this.#error = new PromiseAlikeCanceledError();
//     this.#state = 'canceled';
//     this.#events.emit('cancel');
//   }
//
//   catch<TResult2 = never>(onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseWithSugar<T | TResult2>;
//   catch<T extends Error, R = never>(type: Type<T>, onrejected: (reason: T) => R | PromiseLike<R>): PromiseWithSugar<R>
//   catch<TResult2 = never>(...args: unknown[]): PromiseWithSugar<T | TResult2> {
//
//     if (args.length === 2) {
//       return this.then(undefined, error => {
//         if (error instanceof (args[0] as Type)) {
//           return (args[1] as Function)(error);
//         }
//         throw error;
//       });
//     }
//
//     return this.then(undefined, args[0] as any);
//   }
//
//   then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseWithSugar<TResult1 | TResult2> {
//     return new PromiseWithSugar((resolve, reject) => {
//       if ('completed' === this.#state) {
//         return resolve(this.#value);
//       }
//
//       if ('failed' === this.#state || 'canceled' === this.#state) {
//         return reject(this.#error);
//       }
//
//       this.#events.once('complete', resolve)
//         .once('fail', reject)
//         .once('cancel', () => reject(this.#error));
//     }).then(onfulfilled as any, onrejected);
//
//     // return new Promise((resolve, reject) => { // fallback to Promise to handle #cancel()
//     //   if (['canceled', 'failed'].includes(this.#state!)) {
//     //     if (onrejected) {
//     //       try {
//     //         resolve(onrejected(this.#error));
//     //       } catch (error) {
//     //         reject(error);
//     //       }
//     //     } else {
//     //       reject(this.#error);
//     //     }
//     //   } else if ('completed' === this.#state) {
//     //     if (onfulfilled) {
//     //       try {
//     //         resolve(onfulfilled(this.#value!));
//     //       } catch (error) {
//     //         reject(error);
//     //       }
//     //     } else {
//     //       return resolve(this.#value as any);
//     //     }
//     //   } else {
//     //     if (!this.#listeners) {
//     //       this.#listeners = new Set();
//     //     }
//     //
//     //     this.#listeners!.add({ complete: resolve as any, fail: reject });
//     //   }
//     // });
//   }
// }
