const configuredBasePath = process.env.KELE_ADMIN_BASE_PATH ?? '';

if (configuredBasePath !== '' && !/^\/[a-z0-9-]+$/i.test(configuredBasePath)) {
  throw new Error('KELE_ADMIN_BASE_PATH must be empty or one URL path segment.');
}

export function adminPath(path: string): string {
  if (!path.startsWith('/')) throw new Error('Administrator paths must start with /.');
  if (
    configuredBasePath === '' ||
    path === configuredBasePath ||
    path.startsWith(`${configuredBasePath}/`)
  ) {
    return path;
  }
  return path === '/' ? configuredBasePath || '/' : `${configuredBasePath}${path}`;
}

export function pathInsideAdministratorBase(pathname: string): string {
  if (configuredBasePath === '') return pathname;
  if (pathname === configuredBasePath) return '/';
  if (pathname.startsWith(`${configuredBasePath}/`))
    return pathname.slice(configuredBasePath.length);
  return pathname;
}
