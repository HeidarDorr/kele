import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const profile = 'render_free_uat';
const markerKey = 'quarantine/render-demo-readiness.txt';

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for Render demo storage readiness.`);
  }
  return value.trim();
}

function retryable(error) {
  const status = error?.$metadata?.httpStatusCode;
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

function missingBucket(error) {
  return (
    error?.name === 'NotFound' ||
    error?.name === 'NoSuchBucket' ||
    error?.$metadata?.httpStatusCode === 404
  );
}

async function pause(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ensureBucket(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!missingBucket(error)) throw error;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function verifyReadWrite(client, bucket) {
  const bytes = new TextEncoder().encode('KELE synthetic Render storage readiness\n');
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: markerKey,
      Body: bytes,
      ContentLength: bytes.byteLength,
      ContentType: 'text/plain',
      CacheControl: 'private, no-store',
    }),
  );
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: markerKey }));
  if (object.Body === undefined) throw new Error('Render demo storage returned an empty marker.');
  const restored = await object.Body.transformToString();
  if (restored !== new TextDecoder().decode(bytes)) {
    throw new Error('Render demo storage marker did not round-trip exactly.');
  }
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: markerKey }));
}

async function main() {
  if (process.env.KELE_RENDER_RUNTIME !== 'render' || process.env.KELE_DEMO_PROFILE !== profile) {
    throw new Error('Render demo storage readiness is restricted to the Render free UAT profile.');
  }
  const endpoint = new URL(required('STORAGE_ENDPOINT'));
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.onrender.com')) {
    throw new Error('STORAGE_ENDPOINT must be an HTTPS onrender.com endpoint.');
  }
  const bucket = required('STORAGE_BUCKET');
  if (bucket !== 'kele-render-demo') {
    throw new Error('Render demo storage readiness is restricted to kele-render-demo.');
  }
  const client = new S3Client({
    endpoint: endpoint.toString(),
    region: required('STORAGE_REGION'),
    credentials: {
      accessKeyId: required('STORAGE_ACCESS_KEY'),
      secretAccessKey: required('STORAGE_SECRET_KEY'),
    },
    forcePathStyle: true,
  });

  let failure;
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    try {
      await ensureBucket(client, bucket);
      await verifyReadWrite(client, bucket);
      process.stdout.write('Render demo storage bucket passed read/write/delete readiness.\n');
      return;
    } catch (error) {
      failure = error;
      if (!retryable(error) || attempt === 36) break;
      await pause(Math.min(5_000 * attempt, 15_000));
    }
  }
  throw failure instanceof Error ? failure : new Error('Render demo storage did not become ready.');
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
