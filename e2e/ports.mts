export type E2EApplication = 'api' | 'storefront' | 'admin';

export interface E2EPorts {
  readonly api: number;
  readonly storefront: number;
  readonly admin: number;
}

const defaults: E2EPorts = {
  api: 3001,
  storefront: 3000,
  admin: 3002,
};

const environmentVariableByApplication = {
  api: 'E2E_API_PORT',
  storefront: 'E2E_STOREFRONT_PORT',
  admin: 'E2E_ADMIN_PORT',
} as const satisfies Record<E2EApplication, string>;

function parsePort(variable: string, candidate: string | undefined, fallback: number): number {
  if (candidate === undefined) return fallback;

  if (!/^\d+$/.test(candidate)) {
    throw new Error(`${variable} must be an integer between 1 and 65535.`);
  }

  const port = Number(candidate);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variable} must be an integer between 1 and 65535.`);
  }

  return port;
}

export function readE2EPorts(environment: NodeJS.ProcessEnv = process.env): E2EPorts {
  return {
    api: parsePort(environmentVariableByApplication.api, environment.E2E_API_PORT, defaults.api),
    storefront: parsePort(
      environmentVariableByApplication.storefront,
      environment.E2E_STOREFRONT_PORT,
      defaults.storefront,
    ),
    admin: parsePort(
      environmentVariableByApplication.admin,
      environment.E2E_ADMIN_PORT,
      defaults.admin,
    ),
  };
}

export const e2ePorts = readE2EPorts();
export const e2eUrls = {
  api: `http://127.0.0.1:${String(e2ePorts.api)}/api/v1`,
  storefront: `http://127.0.0.1:${String(e2ePorts.storefront)}`,
  admin: `http://127.0.0.1:${String(e2ePorts.admin)}`,
} as const;
