export type AnyCallback = (...args: any[]) => any;

export type ValueCallback<T> = (value: T) => void;

export type MapCallback<T, R> = (value: T) => R;

export const returnSelf: MapCallback<unknown, unknown> = value => value;

export type PredicateCallback<T> = (value: T) => unknown;

export type VoidCallback = () => void;

export const doNothing = () => void 0;
