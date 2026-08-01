import type { NextRequest } from 'next/server';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`${apiBaseUrl}/${path.map(encodeURIComponent).join('/')}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of [
    'accept',
    'content-type',
    'cookie',
    'if-match',
    'x-correlation-id',
    'x-csrf-token',
  ]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    ...(request.method === 'GET' || request.method === 'HEAD'
      ? {}
      : { body: await request.text() }),
    cache: 'no-store',
    redirect: 'manual',
  });
  const responseHeaders = new Headers();
  for (const name of ['content-type', 'location', 'retry-after', 'x-correlation-id']) {
    const value = upstream.headers.get(name);
    if (value !== null) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie())
    responseHeaders.append('set-cookie', cookie);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const dynamic = 'force-dynamic';
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
