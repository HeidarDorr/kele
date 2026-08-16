'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isIranianMobile, normalizeIranianMobile } from '@kele/design-system/mobile';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const challengeIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function authenticationRequest(path: string, body: object): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function beginAdministratorLogin(formData: FormData): Promise<void> {
  const input = formValue(formData, 'mobile');
  if (!isIranianMobile(input)) redirect('/login?error=mobile');
  const mobile = normalizeIranianMobile(input);

  const response = await authenticationRequest('/admin/auth/otp/challenges', { mobile });
  if (!response.ok) redirect('/login?error=challenge');
  const body = (await response.json()) as { challengeId?: unknown };
  if (typeof body.challengeId !== 'string' || !challengeIdPattern.test(body.challengeId)) {
    redirect('/login?error=challenge');
  }
  redirect(`/login?challenge=${encodeURIComponent(body.challengeId)}`);
}

function responseCookie(response: Response, name: string): string | null {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(';', 1);
    if (pair === undefined) continue;
    const separator = pair.indexOf('=');
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    const value = pair.slice(separator + 1).trim();
    return value.length === 0 ? null : decodeURIComponent(value);
  }
  return null;
}

export async function verifyAdministratorLogin(formData: FormData): Promise<void> {
  const challengeId = formValue(formData, 'challengeId');
  const code = formValue(formData, 'code');
  if (!challengeIdPattern.test(challengeId) || !/^[0-9]{6}$/.test(code)) {
    redirect(`/login?challenge=${encodeURIComponent(challengeId)}&error=verification`);
  }

  const response = await authenticationRequest('/admin/auth/otp/verifications', {
    challengeId,
    code,
  });
  if (!response.ok) {
    redirect(`/login?challenge=${encodeURIComponent(challengeId)}&error=verification`);
  }
  const session = responseCookie(response, 'kele_admin_session');
  const csrf = responseCookie(response, 'kele_admin_csrf');
  if (session === null || csrf === null) redirect('/login?error=session');

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set('kele_admin_session', session, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  cookieStore.set('kele_admin_csrf', csrf, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  redirect('/');
}

export async function logoutAdministrator(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get('kele_admin_session')?.value;
  const csrf = cookieStore.get('kele_admin_csrf')?.value;
  if (session !== undefined && csrf !== undefined) {
    await fetch(`${apiBaseUrl}/admin/auth/session`, {
      method: 'DELETE',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: `kele_admin_session=${encodeURIComponent(session)}; kele_admin_csrf=${encodeURIComponent(csrf)}`,
        'x-csrf-token': csrf,
      },
    }).catch(() => null);
  }
  cookieStore.delete('kele_admin_session');
  cookieStore.delete('kele_admin_csrf');
  redirect('/login');
}
