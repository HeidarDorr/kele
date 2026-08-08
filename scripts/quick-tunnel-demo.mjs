import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environmentFile = path.join(workspace, '.env.quick-tunnel');
const stateDirectory = path.join(workspace, '.data', 'quick-tunnel');
const sessionFile = path.join(stateDirectory, 'session.json');
const lockFile = path.join(stateDirectory, 'session.lock');
const composeFile = path.join(workspace, 'docker-compose.quick-tunnel.yml');
const composeProject = 'kele-quick-tunnel';
const cloudflaredImage =
  'cloudflare/cloudflared@sha256:e39ee8da81ad5e05d77f38d2f51c60ca51bf2a8450ac3abab50c17fdb91d91bf';
const quickTunnelPattern =
  /^https:\/\/(?!api\.)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com$/i;
const applicationPorts = Object.freeze({ storefront: 3000, api: 3001, admin: 3002 });
const pnpmEntry = process.env.npm_execpath;

const spawnedProcesses = new Set();
const runtimeLogs = [];
const tunnelContainers = ['storefront', 'api', 'admin'].map(
  (label) => `kele-quick-tunnel-${label}`,
);
let stopRequested = false;
let signalResolve;
const signalPromise = new Promise((resolve) => {
  signalResolve = resolve;
});

function terminateProcessTree(child) {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill('SIGTERM');
}

function requestStop(signal) {
  if (stopRequested) return;
  stopRequested = true;
  process.stdout.write(`\nStopping KELE Quick Tunnel demo (${signal})...\n`);
  for (const child of spawnedProcesses) terminateProcessTree(child);
  signalResolve(signal);
}

process.once('SIGINT', () => requestStop('SIGINT'));
process.once('SIGTERM', () => requestStop('SIGTERM'));

function parseEnvironment(value) {
  const result = {};
  for (const line of value.split(/\r?\n/)) {
    if (line.length === 0 || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('The Quick Tunnel environment file is malformed.');
    const key = line.slice(0, separator);
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      throw new Error(`The Quick Tunnel environment key ${key} is invalid.`);
    }
    result[key] = line.slice(separator + 1);
  }
  return result;
}

function requireGuardedEnvironment(environment) {
  if (environment.KELE_DEMO_PROFILE !== 'quick_tunnel') {
    throw new Error('.env.quick-tunnel exists but is not a guarded KELE Quick Tunnel profile.');
  }
  if (environment.KELE_DEMO_POSTGRES_DATABASE !== 'kele_e2e') {
    throw new Error('Quick Tunnel destructive operations are restricted to database kele_e2e.');
  }
}

function randomCredential() {
  return randomBytes(24).toString('base64url');
}

async function readEnvironmentIfPresent() {
  const raw = await readFile(environmentFile, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (raw === null) return null;
  const environment = parseEnvironment(raw);
  requireGuardedEnvironment(environment);
  return environment;
}

async function availableLoopbackPorts(count) {
  const servers = [];
  try {
    for (let index = 0; index < count; index += 1) {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      servers.push(server);
    }
    return servers.map((server) => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Failed to allocate an isolated loopback port.');
      }
      return address.port;
    });
  } finally {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise((resolve) => {
            server.close(() => resolve());
          }),
      ),
    );
  }
}

async function assertPortAvailable(port, label) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        reject(
          new Error(`${label} requires port ${String(port)}, but that port is already in use.`),
        );
        return;
      }
      reject(error);
    });
    server.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function validatedQuickTunnelOrigin(raw, label) {
  const parsed = new URL(raw);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.port !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    !quickTunnelPattern.test(parsed.origin)
  ) {
    throw new Error(`${label} did not return a valid HTTPS trycloudflare.com origin.`);
  }
  return parsed.origin;
}

async function configureEnvironment(origins) {
  const existing = (await readEnvironmentIfPresent()) ?? {};
  const [postgresPort, minioApiPort, minioConsolePort] = await availableLoopbackPorts(3);
  const databaseUser = existing.KELE_DEMO_POSTGRES_USER ?? 'kele_demo';
  const databasePassword = existing.KELE_DEMO_POSTGRES_PASSWORD ?? randomCredential();
  const databaseName = 'kele_e2e';
  const storageAccess = existing.KELE_DEMO_MINIO_ROOT_USER ?? `demo${randomCredential()}`;
  const storagePrivate = existing.KELE_DEMO_MINIO_ROOT_PASSWORD ?? randomCredential();
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${String(
    postgresPort,
  )}/${databaseName}?schema=public`;

  const values = [
    ['KELE_DEMO_PROFILE', 'quick_tunnel'],
    ['NODE_ENV', 'development'],
    ['PORT', String(applicationPorts.api)],
    ['KELE_DEMO_POSTGRES_USER', databaseUser],
    ['KELE_DEMO_POSTGRES_PASSWORD', databasePassword],
    ['KELE_DEMO_POSTGRES_DATABASE', databaseName],
    ['KELE_DEMO_POSTGRES_HOST_PORT', String(postgresPort)],
    ['DATABASE_URL', databaseUrl],
    ['E2E_DATABASE_URL', databaseUrl],
    ['KELE_DEMO_MINIO_API_HOST_PORT', String(minioApiPort)],
    ['KELE_DEMO_MINIO_CONSOLE_HOST_PORT', String(minioConsolePort)],
    ['STORAGE_ENDPOINT', `http://127.0.0.1:${String(minioApiPort)}`],
    ['STORAGE_REGION', 'us-east-1'],
    ['STORAGE_BUCKET', 'kele-quick-tunnel'],
    ['STORAGE_PROVIDER', 'minio'],
    ['STORAGE_ACCESS_KEY', storageAccess],
    ['STORAGE_SECRET_KEY', storagePrivate],
    ['KELE_DEMO_MINIO_ROOT_USER', storageAccess],
    ['KELE_DEMO_MINIO_ROOT_PASSWORD', storagePrivate],
    ['PAYMENT_PROVIDER', 'fake'],
    ['REFUND_PROVIDER', 'fake'],
    ['FAKE_PAYMENT_SIGNING_SECRET', existing.FAKE_PAYMENT_SIGNING_SECRET ?? randomCredential()],
    ['SMS_PROVIDER', 'fake'],
    ['FAKE_SMS_OTP_CODE', '111111'],
    ['API_BASE_URL', `http://127.0.0.1:${String(applicationPorts.api)}/api/v1`],
    ['NEXT_PUBLIC_API_BASE_URL', `${origins.api}/api/v1`],
    ['STOREFRONT_ORIGIN', origins.storefront],
    ['ADMIN_ORIGIN', origins.admin],
    ['STOREFRONT_BASE_URL', origins.storefront],
    ['ERROR_MONITORING_PROVIDER', 'structured_log'],
    ['METRICS_BEARER_TOKEN', existing.METRICS_BEARER_TOKEN ?? randomCredential()],
    ['API_JSON_BODY_LIMIT_BYTES', '131072'],
    ['READINESS_TIMEOUT_MS', '1000'],
    ['REQUEST_TIMEOUT_MS', '15000'],
    ['HEADERS_TIMEOUT_MS', '10000'],
    ['KEEP_ALIVE_TIMEOUT_MS', '5000'],
    ['TRUST_PROXY_HOPS', '0'],
    ['CALLBACK_RATE_LIMIT_PER_MINUTE', '120'],
    ['OTP_VERIFY_RATE_LIMIT_PER_MINUTE', '60'],
    ['RATE_LIMIT_MAX_KEYS', '10000'],
    ['PROVIDER_CONNECT_TIMEOUT_MS', '3000'],
    ['PROVIDER_REQUEST_TIMEOUT_MS', '10000'],
    ['KELE_TYPOGRAPHY', 'elize'],
    ['IDENTITY_SIGNING_SECRET', existing.IDENTITY_SIGNING_SECRET ?? randomCredential()],
    ['OTP_VERIFIER_PEPPER', existing.OTP_VERIFIER_PEPPER ?? randomCredential()],
    ['ADMIN_SESSION_PROVIDER', 'development_static'],
    ['ADMIN_SUPER_SESSION_TOKEN', existing.ADMIN_SUPER_SESSION_TOKEN ?? randomCredential()],
    ['ADMIN_INVENTORY_SESSION_TOKEN', existing.ADMIN_INVENTORY_SESSION_TOKEN ?? randomCredential()],
    ['ADMIN_INSTAGRAM_SESSION_TOKEN', existing.ADMIN_INSTAGRAM_SESSION_TOKEN ?? randomCredential()],
  ];
  const output = `# Generated for a temporary Cloudflare Quick Tunnel demo. Never commit.\n${values
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
  const temporary = `${environmentFile}.${String(process.pid)}.tmp`;
  await writeFile(temporary, output, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await rm(environmentFile, { force: true });
  await rename(temporary, environmentFile);
  await chmod(environmentFile, 0o600).catch(() => undefined);
  return Object.fromEntries(values);
}

function track(child) {
  spawnedProcesses.add(child);
  child.once('exit', () => spawnedProcesses.delete(child));
  return child;
}

async function runCommand(command, argumentsForCommand, options = {}) {
  if (stopRequested && options.allowWhenStopping !== true) {
    throw new Error('Quick Tunnel setup was interrupted.');
  }
  await new Promise((resolve, reject) => {
    const child = track(
      spawn(command, argumentsForCommand, {
        cwd: workspace,
        env: options.environment ?? process.env,
        stdio: options.stdio ?? 'inherit',
        windowsHide: true,
      }),
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${path.basename(command)} ${argumentsForCommand.join(' ')} failed with ${
            signal === null ? `exit code ${String(code)}` : `signal ${signal}`
          }.`,
        ),
      );
    });
  });
}

async function runPnpm(argumentsForPnpm, environment) {
  if (pnpmEntry === undefined || pnpmEntry.length === 0) {
    throw new Error('Run this workflow through the repository Pnpm package script.');
  }
  await runCommand(process.execPath, [pnpmEntry, ...argumentsForPnpm], { environment });
}

function composeArguments(...argumentsForCompose) {
  return [
    'compose',
    '--project-name',
    composeProject,
    '--env-file',
    environmentFile,
    '-f',
    composeFile,
    ...argumentsForCompose,
  ];
}

async function acquireLock() {
  await mkdir(stateDirectory, { recursive: true });
  const existing = await readFile(lockFile, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (existing !== null) {
    const pid = Number.parseInt(existing, 10);
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        throw new Error(`A Quick Tunnel demo is already running under PID ${String(pid)}.`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('A Quick Tunnel demo')) throw error;
      }
    }
    await rm(lockFile, { force: true });
  }
  await writeFile(lockFile, `${String(process.pid)}\n`, { encoding: 'utf8', flag: 'wx' });
}

async function startTunnel(label, port) {
  const log = createWriteStream(path.join(stateDirectory, `tunnel-${label}.log`), { flags: 'w' });
  runtimeLogs.push(log);
  const containerName = `kele-quick-tunnel-${label}`;
  const child = track(
    spawn(
      'docker',
      [
        'run',
        '--rm',
        '--name',
        containerName,
        '--add-host',
        'host.docker.internal:host-gateway',
        cloudflaredImage,
        'tunnel',
        '--no-autoupdate',
        '--url',
        `http://host.docker.internal:${String(port)}`,
      ],
      {
        cwd: workspace,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    ),
  );
  const origin = await new Promise((resolve, reject) => {
    let recentOutput = '';
    const timeout = setTimeout(() => {
      reject(new Error(`${label} Quick Tunnel did not return a URL within 90 seconds.`));
    }, 90_000);
    const inspect = (chunk) => {
      const value = chunk.toString('utf8');
      recentOutput = `${recentOutput}${value}`.slice(-4_000);
      log.write(value);
      const match = value.match(
        /https:\/\/(?!api\.)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com/i,
      );
      if (match !== null) {
        clearTimeout(timeout);
        resolve(validatedQuickTunnelOrigin(match[0], label));
      }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      const detail = recentOutput
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .at(-1);
      reject(
        new Error(
          `${label} Quick Tunnel exited before publishing a URL (${signal ?? String(code)})${
            detail === undefined ? '.' : `: ${detail}`
          }`,
        ),
      );
    });
  });
  return { child, containerName, label, origin };
}

async function startLoggedPnpm(label, argumentsForPnpm, environment) {
  if (pnpmEntry === undefined || pnpmEntry.length === 0) {
    throw new Error('Run this workflow through the repository Pnpm package script.');
  }
  const log = createWriteStream(path.join(stateDirectory, `${label}.log`), { flags: 'w' });
  await new Promise((resolve, reject) => {
    log.once('open', resolve);
    log.once('error', reject);
  });
  runtimeLogs.push(log);
  const child = track(
    spawn(process.execPath, [pnpmEntry, ...argumentsForPnpm], {
      cwd: workspace,
      env: environment,
      stdio: ['ignore', log, log],
      windowsHide: true,
    }),
  );
  return { child, label };
}

async function waitForHttp(label, url, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastFailure = 'no response';
  while (Date.now() < deadline && !stopRequested) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(6_000),
      });
      if (response.ok) return;
      lastFailure = `HTTP ${String(response.status)}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await delay(2_000);
  }
  throw new Error(`${label} readiness failed at ${url}: ${lastFailure}.`);
}

function commitId() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: workspace,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

async function writeSession(origins) {
  const value = {
    profile: 'quick_tunnel',
    orchestratorPid: process.pid,
    commit: commitId(),
    startedAt: new Date().toISOString(),
    storefront: origins.storefront,
    administration: origins.admin,
    apiReadiness: `${origins.api}/api/v1/health/ready`,
  };
  await writeFile(sessionFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return value;
}

function printSession(session) {
  process.stdout.write('\nKELE Quick Tunnel demo is ready.\n');
  process.stdout.write(`Storefront: ${session.storefront}\n`);
  process.stdout.write(`Administration: ${session.administration}\n`);
  process.stdout.write(`API readiness: ${session.apiReadiness}\n`);
  process.stdout.write('Synthetic customer OTP: 111111\n');
  process.stdout.write('Keep this terminal open. Press Ctrl+C to stop and invalidate the URLs.\n');
}

async function stopCompose() {
  if (!existsSync(environmentFile)) return;
  await runCommand('docker', composeArguments('down', '--remove-orphans'), {
    allowWhenStopping: true,
  }).catch((error) => {
    process.stderr.write(`Compose cleanup warning: ${error.message}\n`);
  });
}

async function removeTunnelContainers() {
  await Promise.all(
    tunnelContainers.map((containerName) =>
      runCommand('docker', ['rm', '--force', containerName], {
        allowWhenStopping: true,
        stdio: 'ignore',
      }).catch(() => undefined),
    ),
  );
}

async function cleanup() {
  for (const child of [...spawnedProcesses]) terminateProcessTree(child);
  await delay(250);
  await removeTunnelContainers();
  await stopCompose();
  for (const log of runtimeLogs) log.end();
  await rm(sessionFile, { force: true });
  await rm(lockFile, { force: true });
}

async function startDemo(verifyOnly) {
  await acquireLock();
  let setupCompleted = false;
  try {
    await Promise.all([
      assertPortAvailable(applicationPorts.storefront, 'Storefront'),
      assertPortAvailable(applicationPorts.api, 'API'),
      assertPortAvailable(applicationPorts.admin, 'Administration'),
    ]);
    await runCommand('docker', ['version', '--format', 'Docker Engine {{.Server.Version}}']);
    await runCommand('docker', ['compose', 'version']);
    const imageInspection = spawnSync('docker', ['image', 'inspect', cloudflaredImage], {
      cwd: workspace,
      stdio: 'ignore',
      windowsHide: true,
    });
    if (imageInspection.status !== 0) await runCommand('docker', ['pull', cloudflaredImage]);
    await runCommand('docker', ['run', '--rm', cloudflaredImage, '--version']);
    await removeTunnelContainers();

    process.stdout.write('Requesting three anonymous Cloudflare Quick Tunnel URLs...\n');
    const [storefrontTunnel, apiTunnel, adminTunnel] = await Promise.all([
      startTunnel('storefront', applicationPorts.storefront),
      startTunnel('api', applicationPorts.api),
      startTunnel('admin', applicationPorts.admin),
    ]);
    const origins = {
      storefront: storefrontTunnel.origin,
      api: apiTunnel.origin,
      admin: adminTunnel.origin,
    };
    const fileEnvironment = await configureEnvironment(origins);
    const developmentEnvironment = {
      ...process.env,
      ...fileEnvironment,
      CI: 'true',
      KELE_E2E_BUILD: 'true',
    };

    await runCommand('docker', composeArguments('up', '-d', '--wait', 'postgres', 'minio'));
    await runCommand('docker', composeArguments('run', '--rm', 'minio-init'));
    await runPnpm(['--filter', '@kele/api', 'prisma:deploy'], developmentEnvironment);
    await runPnpm(['--filter', '@kele/api', 'seed'], {
      ...developmentEnvironment,
      NODE_ENV: 'test',
      E2E_DATABASE_RESET: 'true',
    });

    const declarationPaths = [
      path.join(workspace, 'apps', 'storefront', 'next-env.d.ts'),
      path.join(workspace, 'apps', 'admin', 'next-env.d.ts'),
    ];
    const declarationContents = await Promise.all(
      declarationPaths.map((declarationPath) => readFile(declarationPath, 'utf8')),
    );
    try {
      await runPnpm(['-r', '--if-present', 'build'], {
        ...developmentEnvironment,
        NODE_ENV: 'production',
      });
    } finally {
      await Promise.all(
        declarationPaths.map((declarationPath, index) =>
          writeFile(declarationPath, declarationContents[index], 'utf8'),
        ),
      );
    }

    const applications = await Promise.all([
      startLoggedPnpm('api', ['--filter', '@kele/api', 'start:prod'], developmentEnvironment),
      startLoggedPnpm('storefront', ['--filter', '@kele/storefront', 'start'], {
        ...developmentEnvironment,
        NODE_ENV: 'production',
      }),
      startLoggedPnpm('admin', ['--filter', '@kele/admin', 'start'], {
        ...developmentEnvironment,
        NODE_ENV: 'production',
      }),
    ]);

    await Promise.all([
      waitForHttp(
        'Local API',
        `http://127.0.0.1:${String(applicationPorts.api)}/api/v1/health/ready`,
        120_000,
      ),
      waitForHttp(
        'Local Storefront',
        `http://127.0.0.1:${String(applicationPorts.storefront)}/`,
        120_000,
      ),
      waitForHttp(
        'Local Administration',
        `http://127.0.0.1:${String(applicationPorts.admin)}/`,
        120_000,
      ),
    ]);
    await Promise.all([
      waitForHttp('Public API', `${origins.api}/api/v1/health/ready`, 120_000),
      waitForHttp('Public Storefront', `${origins.storefront}/`, 120_000),
      waitForHttp('Public Administration', `${origins.admin}/`, 120_000),
    ]);

    const session = await writeSession(origins);
    printSession(session);
    setupCompleted = true;
    if (verifyOnly) {
      process.stdout.write('Verification mode passed; closing all temporary public URLs.\n');
      return;
    }

    const runtimeProcesses = [storefrontTunnel, apiTunnel, adminTunnel, ...applications];
    const unexpectedExit = Promise.race(
      runtimeProcesses.map(
        ({ child, label }) =>
          new Promise((resolve) => {
            child.once('exit', (code, signal) => resolve({ code, label, signal }));
          }),
      ),
    );
    const outcome = await Promise.race([signalPromise.then(() => null), unexpectedExit]);
    if (outcome !== null && !stopRequested) {
      throw new Error(
        `${outcome.label} stopped unexpectedly (${outcome.signal ?? String(outcome.code)}).`,
      );
    }
  } finally {
    await cleanup();
    if (setupCompleted || stopRequested) process.stdout.write('KELE Quick Tunnel demo stopped.\n');
  }
}

async function showUrls() {
  const raw = await readFile(sessionFile, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (raw === null) {
    process.stdout.write('No ready Quick Tunnel session is recorded.\n');
    return;
  }
  const session = JSON.parse(raw);
  if (
    session.profile !== 'quick_tunnel' ||
    !quickTunnelPattern.test(session.storefront) ||
    !quickTunnelPattern.test(session.administration) ||
    !quickTunnelPattern.test(new URL(session.apiReadiness).origin)
  ) {
    throw new Error('The recorded Quick Tunnel session is malformed.');
  }
  try {
    process.kill(session.orchestratorPid, 0);
  } catch {
    throw new Error('The recorded Quick Tunnel session is stale; run the start command again.');
  }
  printSession(session);
}

async function resetDemo() {
  const lock = await readFile(lockFile, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (lock !== null) {
    const pid = Number.parseInt(lock, 10);
    try {
      process.kill(pid, 0);
      throw new Error('Stop the active Quick Tunnel session with Ctrl+C before resetting it.');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Stop the active')) throw error;
    }
  }
  const environment = await readEnvironmentIfPresent();
  if (environment === null) {
    await rm(stateDirectory, { recursive: true, force: true });
    process.stdout.write('No guarded Quick Tunnel data exists.\n');
    return;
  }
  requireGuardedEnvironment(environment);
  await runCommand('docker', composeArguments('down', '--volumes', '--remove-orphans'));
  await rm(environmentFile, { force: true });
  await rm(stateDirectory, { recursive: true, force: true });
  process.stdout.write(
    'Deleted the isolated kele_e2e Quick Tunnel database, storage and runtime data.\n',
  );
}

const command = process.argv[2];
try {
  if (command === 'start') await startDemo(false);
  else if (command === 'verify') await startDemo(true);
  else if (command === 'urls') await showUrls();
  else if (command === 'reset') await resetDemo();
  else throw new Error('Usage: quick-tunnel-demo.mjs <start|verify|urls|reset>');
} catch (error) {
  if (stopRequested) {
    process.exitCode = 0;
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
