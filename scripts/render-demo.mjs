import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';

const profile = 'render_free_uat';
const databaseName = 'kele_e2e';
const packageManagerVersion = '11.18.0';
const storageRefreshIntervalMs = 10 * 60 * 1_000;

function fail(message) {
  throw new Error(`Render demo: ${message}`);
}

function requireRenderRuntime() {
  if (process.env.KELE_RENDER_RUNTIME !== 'render') {
    fail('KELE_RENDER_RUNTIME must identify the Render runtime.');
  }
  if (process.env.KELE_DEMO_PROFILE !== profile) {
    fail(`KELE_DEMO_PROFILE must equal ${profile}.`);
  }
}

function required(name, environment = process.env) {
  const value = environment[name];
  if (value === undefined || value.trim().length === 0) fail(`${name} is required.`);
  return value.trim();
}

function renderOrigin(name, environment = process.env) {
  const hostname = required(name, environment).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname)) {
    fail(`${name} must contain a valid hostname.`);
  }
  if (!hostname.endsWith('.onrender.com')) {
    fail(`${name} must be a Render-managed onrender.com hostname for this free demo.`);
  }
  return `https://${hostname}`;
}

function assertDisposableDatabase(environment) {
  const databaseUrl = new URL(required('DATABASE_URL', environment));
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    fail('DATABASE_URL must use the PostgreSQL protocol.');
  }
  const selectedDatabase = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
  if (selectedDatabase !== databaseName) {
    fail(`destructive seed is restricted to the exact ${databaseName} database.`);
  }
  if (environment.E2E_DATABASE_URL !== environment.DATABASE_URL) {
    fail('E2E_DATABASE_URL must exactly equal DATABASE_URL for the guarded seed.');
  }
}

function apiEnvironment(nodeEnvironment = 'development') {
  requireRenderRuntime();
  const apiOrigin = renderOrigin('RENDER_EXTERNAL_HOSTNAME');
  const storefrontOrigin = renderOrigin('KELE_RENDER_STOREFRONT_HOST');
  const adminOrigin = renderOrigin('KELE_RENDER_ADMIN_HOST');
  const storageOrigin = renderOrigin('KELE_RENDER_STORAGE_HOST');
  const environment = {
    ...process.env,
    NODE_ENV: nodeEnvironment,
    API_BASE_URL: `${apiOrigin}/api/v1`,
    NEXT_PUBLIC_API_BASE_URL: `${apiOrigin}/api/v1`,
    STOREFRONT_ORIGIN: storefrontOrigin,
    ADMIN_ORIGIN: adminOrigin,
    STORAGE_ENDPOINT: storageOrigin,
    STORAGE_PUBLIC_BASE_URL: `${storageOrigin}/${required('STORAGE_BUCKET')}`,
    STORAGE_ACCESS_KEY: required('KELE_RENDER_STORAGE_ACCESS_KEY'),
    STORAGE_SECRET_KEY: required('KELE_RENDER_STORAGE_SECRET_KEY'),
  };
  if (nodeEnvironment === 'test') {
    environment.E2E_DATABASE_URL = required('DATABASE_URL', environment);
  } else {
    delete environment.E2E_DATABASE_URL;
    delete environment.E2E_DATABASE_RESET;
    delete environment.E2E_FIXED_TIME;
    delete environment.E2E_DETERMINISTIC_ID_SEED;
  }
  return environment;
}

function storefrontEnvironment() {
  requireRenderRuntime();
  const apiOrigin = renderOrigin('KELE_RENDER_API_HOST');
  return {
    ...process.env,
    NODE_ENV: 'production',
    API_BASE_URL: `${apiOrigin}/api/v1`,
    NEXT_PUBLIC_API_BASE_URL: `${apiOrigin}/api/v1`,
    STOREFRONT_ORIGIN: renderOrigin('RENDER_EXTERNAL_HOSTNAME'),
  };
}

function adminEnvironment() {
  requireRenderRuntime();
  const apiOrigin = renderOrigin('KELE_RENDER_API_HOST');
  return {
    ...process.env,
    NODE_ENV: 'production',
    API_BASE_URL: `${apiOrigin}/api/v1`,
    NEXT_PUBLIC_API_BASE_URL: `${apiOrigin}/api/v1`,
    STOREFRONT_ORIGIN: renderOrigin('KELE_RENDER_STOREFRONT_HOST'),
    ADMIN_ORIGIN: renderOrigin('RENDER_EXTERNAL_HOSTNAME'),
  };
}

function run(command, args, environment = process.env, forwardSignals = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: environment, stdio: 'inherit' });
    const handlers = new Map();
    if (forwardSignals) {
      for (const signal of ['SIGINT', 'SIGTERM']) {
        const handler = () => child.kill(signal);
        handlers.set(signal, handler);
        process.on(signal, handler);
      }
    }
    const removeHandlers = () => {
      for (const [signal, handler] of handlers) process.off(signal, handler);
    };
    child.once('error', (error) => {
      removeHandlers();
      reject(error);
    });
    child.once('exit', (code, signal) => {
      removeHandlers();
      if (signal !== null) {
        reject(new Error(`${command} terminated by ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${String(code)}.`));
        return;
      }
      resolve();
    });
  });
}

function pnpm(args, environment = process.env, forwardSignals = false) {
  if (process.platform === 'win32') {
    const corepackCli = join(
      dirname(process.execPath),
      'node_modules',
      'corepack',
      'dist',
      'corepack.js',
    );
    return run(
      process.execPath,
      [corepackCli, `pnpm@${packageManagerVersion}`, ...args],
      environment,
      forwardSignals,
    );
  }
  return run('corepack', [`pnpm@${packageManagerVersion}`, ...args], environment, forwardSignals);
}

async function build(target) {
  if (target === 'api') {
    const environment = apiEnvironment();
    await pnpm(['--filter', '@kele/api', 'prisma:generate'], environment);
    await pnpm(['--filter', '@kele/config', 'build'], environment);
    await pnpm(['--filter', '@kele/design-system', 'build'], environment);
    await pnpm(['--filter', '@kele/api', 'build'], environment);
    return;
  }
  if (target === 'storefront') {
    const environment = storefrontEnvironment();
    await pnpm(['--filter', '@kele/design-system', 'build'], environment);
    await pnpm(['--filter', '@kele/storefront', 'build'], environment);
    return;
  }
  if (target === 'admin') {
    const environment = adminEnvironment();
    await pnpm(['--filter', '@kele/design-system', 'build'], environment);
    await pnpm(['--filter', '@kele/admin', 'build'], environment);
    return;
  }
  fail('build target must be api, storefront, or admin.');
}

async function prepareApi() {
  const environment = apiEnvironment('test');
  environment.E2E_DATABASE_RESET = 'true';
  environment.E2E_DETERMINISTIC_ID_SEED = 'kele-render-free-uat-seed-v1';
  assertDisposableDatabase(environment);
  await pnpm(['--filter', '@kele/api', 'prisma:deploy'], environment);
  await pnpm(['--filter', '@kele/api', 'seed'], environment);
}

async function ensureStorage(environment) {
  await pnpm(
    ['--filter', '@kele/api', 'exec', 'node', 'scripts/ensure-render-demo-storage.mjs'],
    environment,
  );
}

async function startApi() {
  const environment = apiEnvironment();
  await ensureStorage(environment);
  let refreshing = false;
  const refresh = setInterval(() => {
    if (refreshing) return;
    refreshing = true;
    void ensureStorage(environment)
      .catch((error) => {
        process.stderr.write(
          `Render demo storage refresh failed: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      })
      .finally(() => {
        refreshing = false;
      });
  }, storageRefreshIntervalMs);
  refresh.unref();
  try {
    await run(process.execPath, ['apps/api/dist/main.js'], environment, true);
  } finally {
    clearInterval(refresh);
  }
}

async function startNext(target) {
  const configuration =
    target === 'storefront'
      ? {
          environment: storefrontEnvironment(),
          executable: 'apps/storefront/node_modules/next/dist/bin/next',
        }
      : target === 'admin'
        ? {
            environment: adminEnvironment(),
            executable: 'apps/admin/node_modules/next/dist/bin/next',
          }
        : null;
  if (configuration === null) fail('start target must be api, storefront, or admin.');
  const port = required('PORT', configuration.environment);
  await run(
    process.execPath,
    [configuration.executable, 'start', '--hostname', '0.0.0.0', '--port', port],
    configuration.environment,
    true,
  );
}

async function requestUntilReady(label, url, expectedContentType) {
  const deadline = Date.now() + 4 * 60 * 1_000;
  let lastFailure = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: { Accept: expectedContentType },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.includes(expectedContentType)) {
        process.stdout.write(`PASS ${label}: ${response.status} ${url}\n`);
        return;
      }
      lastFailure = `HTTP ${String(response.status)} (${contentType || 'no content type'})`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  fail(`${label} did not become ready: ${lastFailure}`);
}

function publicOrigin(name) {
  const raw = required(name);
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.onrender.com')) {
    fail(`${name} must be an HTTPS onrender.com origin.`);
  }
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

async function smoke() {
  const api = publicOrigin('KELE_RENDER_API_ORIGIN');
  const storefront = publicOrigin('KELE_RENDER_STOREFRONT_ORIGIN');
  const admin = publicOrigin('KELE_RENDER_ADMIN_ORIGIN');
  await requestUntilReady('API readiness', `${api}/api/v1/health/ready`, 'application/json');
  await requestUntilReady('Seeded catalog', `${api}/api/v1/catalog/products`, 'application/json');
  await requestUntilReady('Storefront', storefront, 'text/html');
  await requestUntilReady('Administration', admin, 'text/html');
  process.stdout.write('KELE Render free demo smoke passed.\n');
}

async function main() {
  const command = process.argv[2];
  const target = process.argv[3];
  if (command === 'build') return build(target);
  if (command === 'prepare' && target === 'api') return prepareApi();
  if (command === 'start' && target === 'api') return startApi();
  if (command === 'start') return startNext(target);
  if (command === 'smoke') return smoke();
  fail('expected build <target>, prepare api, start <target>, or smoke.');
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
