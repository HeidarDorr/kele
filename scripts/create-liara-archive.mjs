import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(repositoryRoot, 'kele-liara-uat.zip');

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
  throw new Error('Archive creation failed: kele-liara-uat.zip was not created.');
}

process.stdout.write(`Created ${outputPath}\n`);
process.stderr.write(
  'Upload this archive with Liara Console (Drag & Drop) or run `liara deploy` from the repository root.\n',
);
