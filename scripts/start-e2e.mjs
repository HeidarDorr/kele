import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const app = process.argv[2];
const applications = {
  api: { directory: 'apps/api', defaultPort: '3001' },
  storefront: { directory: 'apps/storefront', defaultPort: '3000' },
  admin: { directory: 'apps/admin', defaultPort: '3002' },
};

if (!(app in applications)) throw new Error('Choose api, storefront, or admin for the E2E server.');

const selected = applications[app];
const port = process.env[`E2E_${app.toUpperCase()}_PORT`] ?? selected.defaultPort;
const applicationDirectory = path.resolve(selected.directory);
const entry =
  app === 'api'
    ? path.join(applicationDirectory, 'dist/main.js')
    : createRequire(path.join(applicationDirectory, 'package.json')).resolve('next/dist/bin/next');
const argumentsForApp = app === 'api' ? [] : ['start', '--port', port];
const child = spawn(process.execPath, [entry, ...argumentsForApp], {
  cwd: applicationDirectory,
  env: { ...process.env, NODE_ENV: app === 'api' ? 'test' : 'production', PORT: port },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => (process.exitCode = code ?? (signal === null ? 1 : 0)));
