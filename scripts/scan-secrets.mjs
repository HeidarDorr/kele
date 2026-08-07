import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const root = process.cwd();
const execFileAsync = promisify(execFile);
const allowed = new Set(['.env.example', 'docker-compose.yml']);
const patterns = [
  { name: 'private key', expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', expression: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', expression: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  {
    name: 'generic assigned secret',
    expression: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
  },
];

const findings = [];
const { stdout } = await execFileAsync('git', ['-c', `safe.directory=${root}`, 'ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
for (const relative of stdout.split('\0').filter(Boolean)) {
  if (allowed.has(relative)) continue;
  const content = await readFile(path.resolve(root, relative), 'utf8').catch(() => '');
  for (const pattern of patterns) {
    if (pattern.expression.test(content)) findings.push(`${relative}: ${pattern.name}`);
  }
}

if (findings.length > 0) throw new Error(`Potential secrets found:\n${findings.join('\n')}`);
process.stdout.write('No tracked secrets matched the local policy.\n');
