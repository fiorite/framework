export interface HttpHeaders<T extends string = string> extends Map<T, number | string | string[] | undefined> {
  append(name: string, value: string | readonly string[]): this;
}
