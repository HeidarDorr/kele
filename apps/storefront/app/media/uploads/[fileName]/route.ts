const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
): Promise<Response> {
  const { fileName } = await context.params;
  if (!fileNamePattern.test(fileName)) return new Response('Not found', { status: 404 });
  const upstream = await fetch(`${apiBaseUrl}/catalog/media/${encodeURIComponent(fileName)}`, {
    cache: 'force-cache',
  });
  if (!upstream.ok || upstream.body === null) {
    return new Response('Not found', { status: upstream.status === 404 ? 404 : 502 });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'cache-control':
        upstream.headers.get('cache-control') ?? 'public, max-age=31536000, immutable',
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    },
  });
}
