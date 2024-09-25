// todo: extend api with all the features in the package.

import { addRouting, makeApplication } from '../app';
import { makeServiceProvider } from '../di';

export const make = Object.freeze({
  application: makeApplication,
  provider: makeServiceProvider,
  router: addRouting,
});
