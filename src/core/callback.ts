export type ValueCallback<T> = (value: T) => void;

export const doNothing = () => void 0;

export type MapCallback<T, R> = (value: T) => R;

export const returnSelf: MapCallback<unknown, unknown> = value => value;
