export type ProviderFetch = typeof fetch;

export async function providerFetch(
  fetcher: ProviderFetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: timeout });
  } catch {
    throw new Error('Provider request failed.');
  }
}

export async function providerJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error('Provider returned a non-success status.');
  try {
    return await response.json();
  } catch {
    throw new Error('Provider returned an invalid response.');
  }
}
