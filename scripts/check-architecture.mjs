import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'apps', 'api', 'src', 'modules');
const forbidden = [
  /from ['"]@nestjs\//,
  /from ['"]@prisma\/client['"]/,
  /from ['"](?:express|fastify|axios|node:http|@aws-sdk\/)[^'"]*['"]/,
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? files(target) : [target];
    }),
  );
  return nested.flat();
}

for (const file of await files(root)) {
  if (!/[/\\](domain|application)[/\\].+\.ts$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  if (forbidden.some((pattern) => pattern.test(source))) {
    throw new Error(`Architecture boundary violation in ${path.relative(process.cwd(), file)}.`);
  }
}
