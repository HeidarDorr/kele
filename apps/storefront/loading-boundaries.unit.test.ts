import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appDirectory = resolve(__dirname, 'app');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    }),
  );
  return nested.flat();
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

describe('Storefront route loading boundaries', () => {
  it('covers every file-backed page through its nearest segment or the root boundary', async () => {
    const pages = (await sourceFiles(appDirectory)).filter((path) => path.endsWith('page.tsx'));
    const uncovered: string[] = [];

    for (const page of pages) {
      let segment = dirname(page);
      let covered = false;
      while (segment.startsWith(appDirectory)) {
        if (await exists(resolve(segment, 'loading.tsx'))) {
          covered = true;
          break;
        }
        if (segment === appDirectory) break;
        segment = dirname(segment);
      }
      if (!covered) uncovered.push(relative(appDirectory, page));
    }

    expect(pages.length).toBeGreaterThan(0);
    expect(uncovered).toEqual([]);
  });

  it('uses the shared accessible skeleton primitive in every loading boundary', async () => {
    const loaders = (await sourceFiles(appDirectory)).filter((path) =>
      path.endsWith('loading.tsx'),
    );

    for (const loader of loaders) {
      const source = await readFile(loader, 'utf8');
      const name = relative(appDirectory, loader);
      expect(source, name).toContain('LoadingSkeleton');
      expect(source, name).toContain('role="status"');
      expect(source, name).toContain('aria-busy="true"');
    }

    expect(loaders.length).toBeGreaterThan(0);
  });
});
