import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(repositoryRoot, 'kele-hostiran.zip');

const archive = spawnSync(
  'git',
  [
    'archive',
    '--format=zip',
    `--output=${outputPath}`,
    'HEAD',
    '--',
    '.',
    ':(exclude)output',
    ':(exclude)docs',
    ':(exclude)e2e',
    ':(exclude).github',
  ],
  { cwd: repositoryRoot, stdio: 'inherit' },
);

if (archive.status !== 0) {
  process.exit(archive.status ?? 1);
}

if (!existsSync(outputPath)) {
  throw new Error('Archive creation failed: kele-hostiran.zip was not created.');
}

process.stdout.write(`Created ${outputPath}\n`);
process.stderr.write(
  'Upload and extract this archive on the VPS, then follow docs/hostiran-initial-deployment.md.\n',
);
