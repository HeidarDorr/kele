import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) {
  throw new Error('API dev must be invoked through the pinned pnpm package script.');
}

const children = [];

function spawnTracked(args, options = {}) {
  const child = spawn(process.execPath, [pnpmEntry, ...args], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function runTsc(args) {
  return new Promise((resolve, reject) => {
    const child = spawnTracked(['exec', 'tsc', '-p', 'tsconfig.build.json', ...args]);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`tsc exited with ${String(code)}`));
    });
  });
}

try {
  await runTsc([]);
  spawnTracked(['exec', 'tsc', '-p', 'tsconfig.build.json', '-w', '--preserveWatchOutput']);
  spawn(process.execPath, ['--watch', 'dist/main.js'], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
