export type StoredObject = Readonly<{
  key: string;
  etag: string | null;
  versionId: string | null;
}>;

export interface ObjectStorage {
  readonly provider: string;
  putPrivate(input: {
    key: string;
    bytes: Uint8Array;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  }): Promise<StoredObject>;
  readPrivate(key: string): Promise<Uint8Array>;
  deletePrivate(key: string, versionId?: string): Promise<void>;
  createSignedUpload(input: {
    key: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    expiresInSeconds: number;
  }): Promise<string>;
  createSignedRead(key: string, expiresInSeconds: number): Promise<string>;
  publicUrl(key: string): string;
}
