import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, request as createUpstreamRequest, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export type UatUpstream = 'api' | 'admin' | 'storefront';

export interface LiaraUatRuntimeConfiguration {
  publicOrigin: string;
  publicPort: number;
  apiPort: number;
  storefrontPort: number;
  adminPort: number;
  suiteRoot: string;
}

function boundedPort(value: string | undefined, fallback: number, name: string): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`${name} must be an integer TCP port.`);
  }
  return parsed;
}

function requiredSecret(environment: NodeJS.ProcessEnv, name: string): void {
  const value = environment[name];
  if (value === undefined || value.length < 32 || value.startsWith('development-')) {
    throw new Error(`${name} must be a non-development value with at least 32 characters.`);
  }
}

export function parseLiaraUatRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): LiaraUatRuntimeConfiguration {
  if (environment.NODE_ENV !== 'production' || environment.KELE_DEPLOYMENT_TIER !== 'uat') {
    throw new Error('The Liara suite requires NODE_ENV=production and KELE_DEPLOYMENT_TIER=uat.');
  }
  if (environment.KELE_UAT_BOOTSTRAP !== 'synthetic-only') {
    throw new Error('KELE_UAT_BOOTSTRAP=synthetic-only is required.');
  }
  if (environment.DATABASE_URL === undefined) throw new Error('DATABASE_URL is required.');
  const database = new URL(environment.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }
  const publicOrigin = new URL(environment.KELE_PUBLIC_ORIGIN ?? '');
  if (
    publicOrigin.protocol !== 'https:' ||
    publicOrigin.username !== '' ||
    publicOrigin.password !== '' ||
    publicOrigin.search !== '' ||
    publicOrigin.hash !== '' ||
    (publicOrigin.pathname !== '' && publicOrigin.pathname !== '/')
  ) {
    throw new Error('KELE_PUBLIC_ORIGIN must be an HTTPS origin without a path or credentials.');
  }
  for (const [name, expected] of [
    ['PAYMENT_PROVIDER', 'fake'],
    ['REFUND_PROVIDER', 'fake'],
    ['SMS_PROVIDER', 'fake'],
    ['STORAGE_PROVIDER', 'minio'],
    ['ERROR_MONITORING_PROVIDER', 'structured_log'],
    ['ADMIN_SESSION_PROVIDER', 'postgres_otp'],
  ] as const) {
    if (environment[name] !== expected) {
      throw new Error(`${name}=${expected} is required by the synthetic UAT boundary.`);
    }
  }
  if (!/^\+98[0-9]{10}$/.test(environment.KELE_UAT_ADMIN_MOBILE ?? '')) {
    throw new Error('KELE_UAT_ADMIN_MOBILE must use the +98 followed by 10 digits format.');
  }
  for (const name of [
    'FAKE_PAYMENT_SIGNING_SECRET',
    'METRICS_BEARER_TOKEN',
    'IDENTITY_SIGNING_SECRET',
    'OTP_VERIFIER_PEPPER',
    'ADMIN_SESSION_SIGNING_SECRET',
    'ADMIN_OTP_VERIFIER_PEPPER',
  ]) {
    requiredSecret(environment, name);
  }

  const configuration = {
    publicOrigin: publicOrigin.origin,
    publicPort: boundedPort(environment.PORT, 3000, 'PORT'),
    apiPort: boundedPort(environment.KELE_INTERNAL_API_PORT, 3101, 'KELE_INTERNAL_API_PORT'),
    storefrontPort: boundedPort(
      environment.KELE_INTERNAL_STOREFRONT_PORT,
      3100,
      'KELE_INTERNAL_STOREFRONT_PORT',
    ),
    adminPort: boundedPort(environment.KELE_INTERNAL_ADMIN_PORT, 3102, 'KELE_INTERNAL_ADMIN_PORT'),
    suiteRoot: environment.KELE_SUITE_ROOT ?? '/app',
  } satisfies LiaraUatRuntimeConfiguration;
  const ports = [
    configuration.publicPort,
    configuration.apiPort,
    configuration.storefrontPort,
    configuration.adminPort,
  ];
  if (new Set(ports).size !== ports.length) throw new Error('UAT runtime ports must be distinct.');
  return configuration;
}

export function upstreamForPath(pathname: string): UatUpstream {
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) return 'api';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return 'storefront';
}

function upstreamPort(upstream: UatUpstream, configuration: LiaraUatRuntimeConfiguration): number {
  if (upstream === 'api') return configuration.apiPort;
  if (upstream === 'admin') return configuration.adminPort;
  return configuration.storefrontPort;
}

function appendForwardedFor(request: IncomingMessage): string {
  const current = request.headers['x-forwarded-for'];
  const address = request.socket.remoteAddress ?? 'unknown';
  if (Array.isArray(current)) return [...current, address].join(', ');
  return current === undefined ? address : `${current}, ${address}`;
}

function proxyRequest(
  request: IncomingMessage,
  response: import('node:http').ServerResponse,
  configuration: LiaraUatRuntimeConfiguration,
): void {
  const pathname = new URL(request.url ?? '/', 'http://kele-uat.internal').pathname;
  const upstream = upstreamForPath(pathname);
  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined && !hopByHopHeaders.has(name.toLowerCase())) headers[name] = value;
  }
  headers.host = request.headers.host ?? new URL(configuration.publicOrigin).host;
  headers['x-forwarded-host'] = headers.host;
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-for'] = appendForwardedFor(request);

  const upstreamRequest = createUpstreamRequest(
    {
      hostname: '127.0.0.1',
      port: upstreamPort(upstream, configuration),
      method: request.method,
      path: request.url,
      headers,
    },
    (upstreamResponse) => {
      const responseHeaders: Record<string, string | string[]> = {};
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (value !== undefined && !hopByHopHeaders.has(name.toLowerCase())) {
          responseHeaders[name] = value;
        }
      }
      response.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      upstreamResponse.pipe(response);
    },
  );
  upstreamRequest.on('error', () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.writeHead(502, {
      'content-type': 'application/problem+json',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({ title: 'UAT upstream unavailable', status: 502 }));
  });
  upstreamRequest.setTimeout(30_000, () => {
    upstreamRequest.destroy(new Error('UAT upstream request timed out.'));
  });
  request.on('aborted', () => upstreamRequest.destroy());
  response.on('close', () => {
    if (!response.writableEnded) upstreamRequest.destroy();
  });
  request.pipe(upstreamRequest);
}

async function isReady(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 2_000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function createLiaraUatGateway(configuration: LiaraUatRuntimeConfiguration) {
  const gateway = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://kele-uat.internal').pathname;
    if (pathname === '/__kele/health/live') {
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ status: 'live', boundary: 'synthetic-uat' }));
      return;
    }
    if (pathname === '/__kele/health/ready') {
      void Promise.all([
        isReady(`http://127.0.0.1:${String(configuration.apiPort)}/api/v1/health/ready`),
        isReady(`http://127.0.0.1:${String(configuration.storefrontPort)}/`),
        isReady(`http://127.0.0.1:${String(configuration.adminPort)}/admin/login`),
      ]).then((checks) => {
        const ready = checks.every(Boolean);
        response.writeHead(ready ? 200 : 503, {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        });
        response.end(JSON.stringify({ status: ready ? 'ready' : 'unavailable' }));
      });
      return;
    }
    proxyRequest(request, response, configuration);
  });
  gateway.requestTimeout = 30_000;
  gateway.headersTimeout = 15_000;
  gateway.keepAliveTimeout = 5_000;
  gateway.maxHeadersCount = 100;
  return gateway;
}

async function runNode(
  label: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: environment, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (${signal ?? String(code)}).`));
    });
  });
}

function startService(
  label: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
): ChildProcess {
  const child = spawn(process.execPath, args, { cwd, env: environment, stdio: 'inherit' });
  child.once('error', (error) =>
    process.stderr.write(`${label} failed to start: ${error.message}\n`),
  );
  return child;
}

async function waitForService(label: string, url: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await isReady(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready within 90 seconds.`);
}

function heapOptions(megabytes: string | undefined, fallback: number): string {
  const parsed = Number(megabytes ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 64 || parsed > 512) {
    throw new Error('Each KELE_*_HEAP_MB value must be an integer from 64 through 512.');
  }
  return `--max-old-space-size=${String(parsed)} --conditions=production`;
}

async function main(): Promise<void> {
  const configuration = parseLiaraUatRuntimeEnvironment(process.env);
  const apiRoot = path.join(configuration.suiteRoot, 'api');
  const storefrontRoot = path.join(configuration.suiteRoot, 'storefront');
  const adminRoot = path.join(configuration.suiteRoot, 'admin');
  const internalApiBaseUrl = `http://127.0.0.1:${String(configuration.apiPort)}/api/v1`;
  const sharedEnvironment = {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--conditions=production',
    KELE_DEPLOYMENT_TIER: 'uat',
    API_BASE_URL: internalApiBaseUrl,
    NEXT_PUBLIC_API_BASE_URL: `${configuration.publicOrigin}/api/v1`,
    STOREFRONT_ORIGIN: configuration.publicOrigin,
    ADMIN_ORIGIN: configuration.publicOrigin,
    STOREFRONT_BASE_URL: configuration.publicOrigin,
    KELE_ADMIN_BASE_PATH: '/admin',
  } satisfies NodeJS.ProcessEnv;

  await runNode(
    'Prisma migration',
    [
      path.join(apiRoot, 'node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      path.join(apiRoot, 'prisma/schema.prisma'),
    ],
    sharedEnvironment,
  );
  await runNode(
    'deterministic catalog seed',
    [path.join(apiRoot, 'dist/infrastructure/prisma/seed.js')],
    sharedEnvironment,
  );
  await runNode(
    'synthetic administrator seed',
    [path.join(apiRoot, 'dist/infrastructure/prisma/uat-seed.js')],
    sharedEnvironment,
  );

  const services = [
    startService('API', [path.join(apiRoot, 'dist/main.js')], apiRoot, {
      ...sharedEnvironment,
      PORT: String(configuration.apiPort),
      TRUST_PROXY_HOPS: '1',
      NODE_OPTIONS: `${heapOptions(process.env.KELE_API_HEAP_MB, 128)} --enable-source-maps`,
    }),
    startService(
      'Storefront',
      [
        path.join(storefrontRoot, 'node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        '0.0.0.0',
        '--port',
        String(configuration.storefrontPort),
      ],
      storefrontRoot,
      {
        ...sharedEnvironment,
        PORT: String(configuration.storefrontPort),
        NODE_OPTIONS: heapOptions(process.env.KELE_STOREFRONT_HEAP_MB, 112),
      },
    ),
    startService(
      'Admin',
      [
        path.join(adminRoot, 'node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        '0.0.0.0',
        '--port',
        String(configuration.adminPort),
      ],
      adminRoot,
      {
        ...sharedEnvironment,
        PORT: String(configuration.adminPort),
        NODE_OPTIONS: heapOptions(process.env.KELE_ADMIN_HEAP_MB, 96),
      },
    ),
  ];

  await Promise.all([
    waitForService('API', `http://127.0.0.1:${String(configuration.apiPort)}/api/v1/health/ready`),
    waitForService('Storefront', `http://127.0.0.1:${String(configuration.storefrontPort)}/`),
    waitForService('Admin', `http://127.0.0.1:${String(configuration.adminPort)}/admin/login`),
  ]);

  const gateway = createLiaraUatGateway(configuration);
  let stopping = false;
  const shutdown = (exitCode: number): void => {
    if (stopping) return;
    stopping = true;
    gateway.close();
    for (const service of services) service.kill('SIGTERM');
    const force = setTimeout(() => {
      for (const service of services) if (!service.killed) service.kill('SIGKILL');
    }, 8_000);
    force.unref();
    process.exitCode = exitCode;
  };
  for (const service of services) {
    service.once('exit', (code, signal) => {
      if (!stopping) {
        process.stderr.write(`A UAT service exited unexpectedly (${signal ?? String(code)}).\n`);
        shutdown(1);
      }
    });
  }
  process.once('SIGTERM', () => {
    shutdown(0);
  });
  process.once('SIGINT', () => {
    shutdown(0);
  });
  gateway.listen(configuration.publicPort, '0.0.0.0', () => {
    const address = gateway.address() as AddressInfo;
    process.stdout.write(
      `KELE synthetic UAT is ready on port ${String(address.port)} for ${configuration.publicOrigin}.\n`,
    );
  });
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `KELE Liara UAT bootstrap failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
    // A bootstrap failure may happen after one or more child services have
    // started. Exit the supervisor immediately so the container cannot remain
    // alive in a partially initialized state.
    process.exit(1);
  });
}
