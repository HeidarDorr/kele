import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage', '.data']);
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

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sourceFiles(target)));
    else result.push(target);
  }
  return result;
}

const findings = [];
for (const file of await sourceFiles(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (allowed.has(relative)) continue;
  const content = await readFile(file, 'utf8').catch(() => '');
  for (const pattern of patterns) {
    if (pattern.expression.test(content)) findings.push(`${relative}: ${pattern.name}`);
  }
}

if (findings.length > 0) throw new Error(`Potential secrets found:\n${findings.join('\n')}`);
process.stdout.write('No tracked secrets matched the local policy.\n');
