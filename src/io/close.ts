export type MaybeErrorCallback = (error?: unknown) => void;

export type CloseFunction = (callback?: MaybeErrorCallback) => void;

export interface Closeable {
  close(callback?: MaybeErrorCallback): void;
}
