import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { config as loadEnvironment } from 'dotenv';
import { readE2EPorts } from '../e2e/ports.mts';
import { evidenceFixedTime, evidenceIdSeed } from '../e2e/evidence-fixtures.mts';
import { readE2EDatabaseConfiguration } from '../packages/config/src/e2e-database.ts';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvironment({ path: path.join(workspace, '.env'), override: false });

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) {
  throw new Error('pnpm test:e2e must be invoked through the pinned pnpm package script.');
}

const requestedEnvironment = {
  ...process.env,
  E2E_API_PORT: process.env.E2E_API_PORT ?? '3101',
  E2E_STOREFRONT_PORT: process.env.E2E_STOREFRONT_PORT ?? '3100',
  E2E_ADMIN_PORT: process.env.E2E_ADMIN_PORT ?? '3102',
};
const browserExecutable = resolveBrowserExecutable(requestedEnvironment);
const databaseConfiguration = readE2EDatabaseConfiguration(requestedEnvironment);
const ports = readE2EPorts(requestedEnvironment);
const storefrontOrigin = `http://127.0.0.1:${String(ports.storefront)}`;
const adminOrigin = `http://127.0.0.1:${String(ports.admin)}`;
const apiBaseUrl = `http://127.0.0.1:${String(ports.api)}/api/v1`;
const presentationToken = randomBytes(32).toString('hex');
const sharedEnvironment = {
  ...requestedEnvironment,
  CI: 'true',
  KELE_E2E_BUILD: 'true',
  STOREFRONT_BASE_URL: storefrontOrigin,
  STOREFRONT_ORIGIN: storefrontOrigin,
  ADMIN_ORIGIN: adminOrigin,
  API_BASE_URL: apiBaseUrl,
  NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  DATABASE_URL: databaseConfiguration.databaseUrl,
  E2E_DATABASE_URL: databaseConfiguration.databaseUrl,
  E2E_FIXED_TIME: evidenceFixedTime,
  E2E_DETERMINISTIC_ID_SEED: evidenceIdSeed,
  KELE_E2E_PRESENTATION_TOKEN: presentationToken,
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: browserExecutable,
  TZ: 'Asia/Tehran',
};
const generatedDeclarationPaths = [
  path.join(workspace, 'apps/storefront/next-env.d.ts'),
  path.join(workspace, 'apps/admin/next-env.d.ts'),
];
const generatedDeclarationContents = await Promise.all(
  generatedDeclarationPaths.map((declarationPath) => readFile(declarationPath, 'utf8')),
);
const serverProcesses = [];

function resolveBrowserExecutable(environment) {
  const explicit = environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    const explicitPath = path.resolve(explicit);
    if (!existsSync(explicitPath)) {
      throw new Error(`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH does not exist: ${explicitPath}`);
    }
    console.log(`[e2e] Browser executable: ${explicitPath} (explicit)`);
    return explicitPath;
  }

  const candidates = [];
  const addCandidate = (...segments) => {
    if (segments[0] !== undefined && segments[0].length > 0) {
      candidates.push(path.join(...segments));
    }
  };

  if (process.platform === 'win32') {
    addCandidate(environment.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe');
    addCandidate(environment['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe');
    addCandidate(environment.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe');
    addCandidate(environment.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    addCandidate(
      environment['ProgramFiles(x86)'],
      'Microsoft',
      'Edge',
      'Application',
      'msedge.exe',
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  }

  try {
    const rootPackage = path.join(workspace, 'package.json');
    const { chromium } = createRequire(rootPackage)('@playwright/test');
    candidates.push(chromium.executablePath());
  } catch {
    // A system browser is sufficient; the Playwright-managed browser is optional.
  }

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (resolved === undefined) {
    throw new Error(
      'No Chromium-compatible executable was found. Install Chrome/Edge/Chromium or set ' +
        'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to an existing executable. The M9 gate does not ' +
        'download Playwright Headless Shell at runtime.',
    );
  }

  console.log(`[e2e] Browser executable: ${resolved} (auto-detected)`);
  return resolved;
}

async function runPnpm(argumentsForPnpm, environment) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [pnpmEntry, ...argumentsForPnpm], {
      cwd: workspace,
      env: environment,
      stdio: 'inherit',
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `pnpm ${argumentsForPnpm.join(' ')} failed with ${
            signal === null ? `exit code ${String(code)}` : `signal ${signal}`
          }.`,
        ),
      );
    });
  });
}

async function runNode(entry, argumentsForEntry, environment) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [entry, ...argumentsForEntry], {
      cwd: workspace,
      env: environment,
      stdio: 'inherit',
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `${path.basename(entry)} ${argumentsForEntry.join(' ')} failed with ${
            signal === null ? `exit code ${String(code)}` : `signal ${signal}`
          }.`,
        ),
      );
    });
  });
}

async function ensureE2EDatabase() {
  const apiPackage = path.join(workspace, 'apps/api/package.json');
  const { PrismaClient } = createRequire(apiPackage)('@prisma/client');
  const maintenanceClient = new PrismaClient({
    datasources: { db: { url: databaseConfiguration.maintenanceUrl } },
  });

  try {
    const databases = await maintenanceClient.$queryRawUnsafe(
      'SELECT datname FROM pg_database WHERE datname = $1',
      databaseConfiguration.databaseName,
    );
    if (databases.length === 0) {
      await maintenanceClient.$executeRawUnsafe('CREATE DATABASE "kele_e2e"');
      console.log('[e2e] Created isolated PostgreSQL database kele_e2e.');
    } else {
      console.log('[e2e] Reusing isolated PostgreSQL database kele_e2e.');
    }
  } finally {
    await maintenanceClient.$disconnect();
  }
}

function startServer({ entry, argumentsForServer = [], directory, environment }) {
  const server = spawn(process.execPath, [entry, ...argumentsForServer], {
    cwd: directory,
    env: environment,
    stdio: 'inherit',
  });
  serverProcesses.push(server);
  return server;
}

async function waitForServer(server, url) {
  let startupError;
  server.once('error', (error) => {
    startupError = error;
  });
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (startupError !== undefined) throw startupError;
    if (server.exitCode !== null) {
      throw new Error(`E2E server for ${url} exited with code ${String(server.exitCode)}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server has not opened its socket yet.
    }
    await delay(250);
  }

  throw new Error(`E2E server for ${url} did not become ready within 30 seconds.`);
}

async function stopServer(server) {
  if (server.pid === undefined || server.exitCode !== null) return;

  if (process.platform === 'win32') {
    await new Promise((resolveStop) => {
      const killer = spawn('taskkill.exe', ['/pid', String(server.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', () => resolveStop());
      killer.once('exit', () => resolveStop());
    });
    return;
  }

  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveStop) => server.once('exit', resolveStop)),
    delay(5_000),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

let runFailure;
try {
  const buildEnvironment = { ...sharedEnvironment, NODE_ENV: 'production' };
  await runPnpm(['--filter', '@kele/api', 'build'], buildEnvironment);
  await runPnpm(['--filter', '@kele/storefront', 'build'], buildEnvironment);
  await runPnpm(['--filter', '@kele/admin', 'build'], buildEnvironment);
  await ensureE2EDatabase();
  console.log(`[e2e] Resetting guarded database ${databaseConfiguration.databaseName}.`);
  await runPnpm(
    [
      '--filter',
      '@kele/api',
      'exec',
      'prisma',
      'migrate',
      'reset',
      '--force',
      '--skip-seed',
      '--skip-generate',
    ],
    {
      ...sharedEnvironment,
      NODE_ENV: 'test',
      E2E_DATABASE_RESET: 'true',
    },
  );
  await runPnpm(['--filter', '@kele/api', 'seed'], {
    ...sharedEnvironment,
    NODE_ENV: 'test',
    E2E_DATABASE_RESET: 'true',
  });

  const apiDirectory = path.join(workspace, 'apps/api');
  const storefrontDirectory = path.join(workspace, 'apps/storefront');
  const adminDirectory = path.join(workspace, 'apps/admin');
  const resolveNext = (directory) =>
    createRequire(path.join(directory, 'package.json')).resolve('next/dist/bin/next');
  const apiServer = startServer({
    entry: path.join(apiDirectory, 'dist/main.js'),
    directory: apiDirectory,
    environment: { ...sharedEnvironment, NODE_ENV: 'test', PORT: String(ports.api) },
  });
  await waitForServer(apiServer, `${apiBaseUrl}/health/live`);

  const nextEnvironment = { ...sharedEnvironment, NODE_ENV: 'production' };
  const storefrontServer = startServer({
    entry: resolveNext(storefrontDirectory),
    argumentsForServer: ['start', '--port', String(ports.storefront)],
    directory: storefrontDirectory,
    environment: nextEnvironment,
  });
  const adminServer = startServer({
    entry: resolveNext(adminDirectory),
    argumentsForServer: ['start', '--port', String(ports.admin)],
    directory: adminDirectory,
    environment: nextEnvironment,
  });
  await Promise.all([
    waitForServer(storefrontServer, storefrontOrigin),
    waitForServer(adminServer, `http://127.0.0.1:${String(ports.admin)}`),
  ]);

  const playwrightEntry = createRequire(path.join(workspace, 'package.json')).resolve(
    '@playwright/test/cli',
  );
  const forwardedArguments = process.argv.slice(2);
  if (forwardedArguments[0] === '--') forwardedArguments.shift();
  await runNode(playwrightEntry, ['test', ...forwardedArguments], {
    ...sharedEnvironment,
    NODE_ENV: 'test',
    E2E_DATABASE_RESET: 'true',
  });
  if (process.env.M9_RUN_LOAD === 'true') {
    await runNode(path.join(workspace, 'scripts/run-m9-load.mjs'), [], {
      ...sharedEnvironment,
      NODE_ENV: 'test',
      M9_LOAD_CONFIRM_SYNTHETIC: 'isolated-kele-e2e',
    });
  }
  console.log('[e2e] Browser acceptance completed; stopping isolated servers.');
} catch (error) {
  runFailure = error;
} finally {
  await Promise.allSettled(serverProcesses.toReversed().map(stopServer));
  if (serverProcesses.length > 0) console.log('[e2e] Isolated servers stopped.');
  await Promise.all(
    generatedDeclarationPaths.map((declarationPath, index) =>
      writeFile(declarationPath, generatedDeclarationContents[index], 'utf8'),
    ),
  );
}

if (runFailure !== undefined) console.error(runFailure);
process.exit(runFailure === undefined ? 0 : 1);
