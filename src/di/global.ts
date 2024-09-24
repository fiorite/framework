/**
 * New Angular gave an idea to put this thing here.
 * However, there no chance to bind `provide()` to request context.
 * Thus, this feature is only limited for unscoped providers and, perhaps, two and more apps
 * using it will get an error upon concurrent call.
 * Also, promise-based services require callback to be added.
 * Error can appear in runtime, moving async -> sync can cause an error.
 * Use it if you have test coverage and are able to track an issue.
 * Tips:
 * - Use for class constructor and methods (HTTP route handlers)
 * - Use for a single application and global services (non-scoped).
 * - Test cases will become more complex, use on your consideration.
 * There a chance, in the future, to get a better understanding on improvements.
 */
import type { ServiceProvider } from './provider';
import type { InstantServiceProvideFunction } from './instant';

const defaultImplementation: InstantServiceProvideFunction = () => {
  throw new Error('provide() implementation not defined in this context.');
};

let provideImplementation: InstantServiceProvideFunction = defaultImplementation;

export const provide = ((provide, callback) => {
  return provideImplementation(provide, callback);
}) as InstantServiceProvideFunction;

let callers = 0;

/**
 * @param provider
 * @param callback
 */
export function runProviderContext(provider: ServiceProvider, callback: (complete: () => void) => void) {
  let done = false;
  const complete = () => {
    if (!done) {
      callers--;
      if (callers <= 0) {
        provideImplementation = defaultImplementation;
      }
      done = true;
    }
  };

  const implementation = provider.instant;

  if (provideImplementation === implementation) {
    callers++;
    callback(complete);
  } else {
    if (callers > 0) {
      throw new Error(`Implementation has been busy (clients: ${callers}). Consider using this feature in single app.`);
    }

    if (provider.scoped) {
      throw new Error('Unable to use Scoped provider implementation. To avoid sharing context of particular client.');
    }

    provideImplementation = implementation;
    callers++;
    callback(complete);
  }
}
