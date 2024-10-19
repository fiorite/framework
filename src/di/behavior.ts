// export enum ServiceBehavior {
//   /**
//    * Inherits {@link ServiceBehavior.Scoped} if service depends on it,
//    * otherwise {@link ServiceBehavior.Singleton} is being used.
//    */
//   Inherited,
//
//   /**
//    * Returns single, reusable instance on exec.
//    */
//   Singleton,
//
//   /**
//    * Creates new instance on exec.
//    */
//   Prototype,
//
//   /**
//    * Caches instances per provided scope (could be HTTP Request, WebSocket or other kind of session).
//    */
//   Scoped,
// }

/**
 * Previously enum however, converted to class to avoid overload collision in {@link ServiceProvider.add} subtype or string or number (basically give more options there).
 */
export class ServiceBehavior extends String {
  private static readonly _inherited = new ServiceBehavior('inherited');

  /**
   * Inherits {@link ServiceBehavior.Scoped} if service depends on it,
   * otherwise {@link ServiceBehavior.Singleton} is being used.
   */
  static get Inherited(): ServiceBehavior {
    return this._inherited;
  }

  private static readonly _singleton = new ServiceBehavior('singleton');

  /**
   * Returns single, reusable instance on exec.
   */
  static get Singleton(): ServiceBehavior {
    return this._singleton;
  }

  private static readonly _prototype = new ServiceBehavior('prototype');

  /**
   * Creates new instance on exec.
   */
  static get Prototype(): ServiceBehavior {
    return this._prototype;
  }

  private static readonly _scoped = new ServiceBehavior('scoped');

  /**
   * Caches instances per provided scope (could be HTTP Request, WebSocket or other kind of session).
   */
  static get Scoped(): ServiceBehavior {
    return this._scoped;
  }

  private constructor(value: string) {
    super(value);
  }
}
