export class RouteParams extends Map<string, string | number | boolean> {
  get [Symbol.toStringTag](): string {
    return 'RouteParams';
  }

  /** @deprecated move to iterable */
  toRecord(): Record<string, string | number | boolean> {
    return Array.from(this).reduce((object, entry) => {
      object[entry[0]] = entry[1];
      return object;
    }, {} as Record<string, string | number | boolean>);
  }
}
