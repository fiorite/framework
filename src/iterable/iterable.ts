export const isIterable = <T>(object: unknown): object is Iterable<T> => {
  return typeof object === 'object' && null !== object && Symbol.iterator in object;
};
