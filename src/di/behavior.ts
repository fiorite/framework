export enum ServiceBehavior {
  /**
   * Inherits {@link ServiceBehavior.Scoped} if service depends on it,
   * otherwise {@link ServiceBehavior.Singleton} is being used.
   */
  Inherited,

  /**
   * Returns single, reusable instance on exec.
   */
  Singleton,

  /**
   * Creates new instance on exec.
   */
  Prototype,

  /**
   * Caches instances per provided scope (could be HTTP Request, WebSocket or other kind of session).
   */
  Scoped,
}
