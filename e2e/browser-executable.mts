import process from 'node:process';

export function configuredBrowserExecutable(): string | undefined {
  const executable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  return executable === undefined || executable.length === 0 ? undefined : executable;
}
