export enum ServiceBehaviour {
  /**
   * Inherits {@link ServiceBehaviour.Scoped} if service depends on it,
   * otherwise {@link ServiceBehaviour.Singleton} is being used.
   */
  Inherit,

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
