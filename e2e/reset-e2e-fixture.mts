import { spawn } from 'node:child_process';
import process from 'node:process';

const workspace = process.cwd();

export async function resetDeterministicE2EFixture(): Promise<void> {
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry) {
    throw new Error('The E2E fixture reset must run through the pinned pnpm package script.');
  }

  await new Promise<void>((resolveReset, rejectReset) => {
    const child = spawn(process.execPath, [pnpmEntry, '--filter', '@kele/api', 'seed'], {
      cwd: workspace,
      env: {
        ...process.env,
        E2E_DATABASE_RESET: 'true',
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    });

    child.once('error', rejectReset);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveReset();
        return;
      }

      rejectReset(
        new Error(
          `Deterministic E2E fixture reset failed with ${
            signal === null ? `exit code ${String(code)}` : `signal ${signal}`
          }.`,
        ),
      );
    });
  });
}
