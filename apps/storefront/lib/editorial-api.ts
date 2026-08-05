import type { components } from '@kele/api-contract';

export type PublishedHomepage = components['schemas']['PublishedHomepage'];
export type JournalCard = components['schemas']['JournalCard'];
export type JournalPage = components['schemas']['JournalPage'];
export type PublishedJournalArticle = components['schemas']['PublishedJournalArticle'];
export type PublishedSiteSettings = components['schemas']['PublishedSiteSettings'];
export type Occasion = components['schemas']['CategorySummary'];

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

export class EditorialApiError extends Error {
  constructor(public readonly status: number) {
    super(`Editorial request failed with ${String(status)}.`);
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new EditorialApiError(response.status);
  return (await response.json()) as T;
}

export const getHomepage = () => request<PublishedHomepage>('/homepage');
export const getJournal = (limit = 12) => request<JournalPage>(`/journal?limit=${String(limit)}`);
export const getJournalArticle = (slug: string) =>
  request<PublishedJournalArticle>(`/journal/${encodeURIComponent(slug)}`);
export const getOccasions = () => request<{ items: Occasion[] }>('/discovery/occasions');
export const getSiteSettings = () => request<PublishedSiteSettings>('/settings/site');
