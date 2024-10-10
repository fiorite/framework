// todo: extend api with all the features in the package.

import { featureRouting, makeApplication } from '../app';

export const make = Object.freeze({
  application: makeApplication,
  // router: addRouting,
});
