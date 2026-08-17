export interface Exporter<T> {
  export(data: T): Promise<string | Uint8Array>;
}
