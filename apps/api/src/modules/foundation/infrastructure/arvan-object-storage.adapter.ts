import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStorage, StoredObject } from '../application/object-storage.port.js';

const allowedKey = /^(?:quarantine|media)\/[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/;

function assertKey(key: string): void {
  if (!allowedKey.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error('Object key is outside the approved media namespace.');
  }
}

function assertExpiry(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 900) {
    throw new Error('Signed URL expiry must be between 30 and 900 seconds.');
  }
}

export class S3ObjectStorageAdapter implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    readonly provider: string,
    private readonly bucket: string,
    endpoint: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly publicBaseUrl: string,
  ) {
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
  }

  async putPrivate(input: {
    key: string;
    bytes: Uint8Array;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  }): Promise<StoredObject> {
    assertKey(input.key);
    const result = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.bytes,
        ContentLength: input.bytes.byteLength,
        ContentType: input.contentType,
        CacheControl: input.key.startsWith('media/')
          ? 'public, max-age=31536000, immutable'
          : 'private, no-store',
        ServerSideEncryption: 'AES256',
      }),
    );
    return {
      key: input.key,
      etag: result.ETag ?? null,
      versionId: result.VersionId ?? null,
    };
  }

  async readPrivate(key: string): Promise<Uint8Array> {
    assertKey(key);
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (result.Body === undefined) throw new Error('Object storage returned an empty body.');
    return result.Body.transformToByteArray();
  }

  async deletePrivate(key: string, versionId?: string): Promise<void> {
    assertKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key, VersionId: versionId }),
    );
  }

  createSignedUpload(input: {
    key: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    expiresInSeconds: number;
  }): Promise<string> {
    assertKey(input.key);
    assertExpiry(input.expiresInSeconds);
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ServerSideEncryption: 'AES256',
      }),
      { expiresIn: input.expiresInSeconds },
    );
  }

  createSignedRead(key: string, expiresInSeconds: number): Promise<string> {
    assertKey(key);
    assertExpiry(expiresInSeconds);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  publicUrl(key: string): string {
    assertKey(key);
    if (!key.startsWith('media/')) throw new Error('Quarantined objects have no public URL.');
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${encoded}`;
  }
}

export class ArvanObjectStorageAdapter extends S3ObjectStorageAdapter {
  constructor(
    bucket: string,
    endpoint: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    publicBaseUrl: string,
  ) {
    super('arvan_s3', bucket, endpoint, region, accessKeyId, secretAccessKey, publicBaseUrl);
  }
}
