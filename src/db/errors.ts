import { DbModel } from './model';

export class DbObjectNotFound<TModel = unknown> implements Error {
  readonly name = 'DbObjectNotFound';
  readonly message: string;

  constructor(model: DbModel<TModel>) {
    this.message = 'Database object is not found (' + model.name + ').';
  }
}
