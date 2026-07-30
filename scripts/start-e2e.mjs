import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const app = process.argv[2];
const applications = {
  api: { directory: 'apps/api', arguments: [] },
  storefront: { directory: 'apps/storefront', arguments: ['start', '--port', '3000'] },
  admin: { directory: 'apps/admin', arguments: ['start', '--port', '3002'] },
};

if (!(app in applications)) throw new Error('Choose api, storefront, or admin for the E2E server.');

const selected = applications[app];
const applicationDirectory = path.resolve(selected.directory);
const entry =
  app === 'api'
    ? path.join(applicationDirectory, 'dist/main.js')
    : createRequire(path.join(applicationDirectory, 'package.json')).resolve('next/dist/bin/next');
const child = spawn(process.execPath, [entry, ...selected.arguments], {
  cwd: applicationDirectory,
  env: { ...process.env, NODE_ENV: app === 'api' ? 'test' : 'production' },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => (process.exitCode = code ?? (signal === null ? 1 : 0)));
