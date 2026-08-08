import type { Request, Response } from 'express';

export const ADMIN_SESSION_COOKIE = 'kele_admin_session';
export const ADMIN_CSRF_COOKIE = 'kele_admin_csrf';

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1_000;

export class AdministratorCookieSecurity {
  constructor(private readonly secure: boolean) {}

  read(request: Request, name: string): string | null {
    const header = request.headers.cookie;
    if (header === undefined) return null;
    for (const item of header.split(';')) {
      const separator = item.indexOf('=');
      if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
      try {
        return decodeURIComponent(item.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  setSession(response: Response, sessionToken: string, csrfToken: string): void {
    response.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
      ...this.options(true),
      maxAge: SESSION_MAX_AGE_MS,
    });
    response.cookie(ADMIN_CSRF_COOKIE, csrfToken, {
      ...this.options(false),
      maxAge: SESSION_MAX_AGE_MS,
    });
  }

  clear(response: Response): void {
    response.clearCookie(ADMIN_SESSION_COOKIE, this.options(true));
    response.clearCookie(ADMIN_CSRF_COOKIE, this.options(false));
  }

  private options(httpOnly: boolean) {
    return {
      httpOnly,
      secure: this.secure,
      sameSite: 'strict' as const,
      path: '/',
    };
  }
}
