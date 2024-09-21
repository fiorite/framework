export type CloseFunction = () => void;

export interface Closeable {
  close(): void;
}
