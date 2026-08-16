import type { components } from '@kele/api-contract';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

export type AdminProduct = components['schemas']['AdminProduct'];
export type AdminProductPage = components['schemas']['AdminProductPage'];
export type AdminCategory = components['schemas']['AdminCategory'];
export type MediaValue = components['schemas']['Media'];
export type PublicationValidation = components['schemas']['PublicationValidation'];
export type ProductPreview = components['schemas']['AdminProductPreview'];
export type Inventory = components['schemas']['Inventory'];
export type AdminOutfit = components['schemas']['AdminOutfit'];
export type AdminOutfitPage = components['schemas']['AdminOutfitPage'];
export type OutfitPreview = components['schemas']['AdminOutfitPreview'];
export type OutfitRevision = components['schemas']['OutfitRevisionSummary'];
export type AdminOrder = components['schemas']['AdminOrder'];
export type AdminOrderPage = components['schemas']['AdminOrderPage'];
export type ReturnRequest = components['schemas']['ReturnRequest'];
export interface ReturnRequestPage {
  items: ReturnRequest[];
  page: components['schemas']['CursorPage'];
}
export type AuditEventPage = components['schemas']['AuditEventPage'];
export type BulkOperation = components['schemas']['BulkOperation'];
export type AdminHomepage = components['schemas']['AdminHomepage'];
export type PublishedHomepage = components['schemas']['PublishedHomepage'];
export type AdminJournalArticle = components['schemas']['AdminJournalArticle'];
export type PublishedJournalArticle = components['schemas']['PublishedJournalArticle'];
export type AdminSiteSettings = components['schemas']['AdminSiteSettings'];
export type PublishedSiteSettings = components['schemas']['PublishedSiteSettings'];
export type MediaReferenceReport = components['schemas']['MediaReferenceReport'];

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const sessionToken =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
const postgresAdministratorSessions = process.env.ADMIN_SESSION_PROVIDER === 'postgres_otp';

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (postgresAdministratorSessions) {
    const cookieStore = await cookies();
    const administratorSession = cookieStore.get('kele_admin_session')?.value;
    const administratorCsrf = cookieStore.get('kele_admin_csrf')?.value;
    if (administratorSession !== undefined) {
      headers.set(
        'cookie',
        `kele_admin_session=${encodeURIComponent(administratorSession)}${
          administratorCsrf === undefined
            ? ''
            : `; kele_admin_csrf=${encodeURIComponent(administratorCsrf)}`
        }`,
      );
    }
    if (
      administratorCsrf !== undefined &&
      !['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase())
    ) {
      headers.set('x-csrf-token', administratorCsrf);
    }
  } else {
    headers.set('cookie', `kele_session=${encodeURIComponent(sessionToken)}`);
  }
  headers.set('x-correlation-id', randomUUID());
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string;
      errors?: Array<{ message: string }>;
    } | null;
    const messages = problem?.errors?.map((item) => item.message).join(' ') ?? '';
    throw new AdminApiError(
      response.status,
      messages || problem?.detail || `Admin request failed with ${String(response.status)}.`,
    );
  }
  return (await response.json()) as T;
}

export const listProducts = () => adminRequest<AdminProductPage>('/admin/products?limit=100');
export const getProduct = (id: string) => adminRequest<AdminProduct>(`/admin/products/${id}`);
export const listCategories = () => adminRequest<AdminCategory[]>('/admin/categories');
export const listMedia = () => adminRequest<MediaValue[]>('/admin/media');
export const validateProduct = (id: string) =>
  adminRequest<PublicationValidation>(`/admin/products/${id}/validation`);
export const previewProduct = (id: string) =>
  adminRequest<ProductPreview>(`/admin/products/${id}/preview`);
export const listOutfits = () => adminRequest<AdminOutfitPage>('/admin/outfits');
export const getOutfit = (id: string) => adminRequest<AdminOutfit>(`/admin/outfits/${id}`);
export const validateOutfit = (id: string) =>
  adminRequest<PublicationValidation>(`/admin/outfits/${id}/validation`);
export const previewOutfit = (id: string) =>
  adminRequest<OutfitPreview>(`/admin/outfits/${id}/preview`);
export const listOutfitRevisions = (id: string) =>
  adminRequest<OutfitRevision[]>(`/admin/outfits/${id}/revisions`);
export const listAdminOrders = (query = '') =>
  adminRequest<AdminOrderPage>(`/admin/orders${query.length > 0 ? `?${query}` : ''}`);
export const getAdminOrder = (orderNumber: string) =>
  adminRequest<AdminOrder>(`/admin/orders/${encodeURIComponent(orderNumber)}`);
export const listReturnRequests = (status = '') =>
  adminRequest<ReturnRequestPage>(
    `/admin/returns${status ? `?status=${encodeURIComponent(status)}` : ''}`,
  );
export const listAuditEvents = (query = '') =>
  adminRequest<AuditEventPage>(`/admin/audit-events${query.length > 0 ? `?${query}` : ''}`);
export const getBulkOperation = (id: string) =>
  adminRequest<BulkOperation>(`/admin/bulk-operations/${encodeURIComponent(id)}`);
export const getHomepageDraft = () => adminRequest<AdminHomepage>('/admin/homepage');
export const previewHomepage = () => adminRequest<PublishedHomepage>('/admin/homepage/preview');
export const listJournalDrafts = () => adminRequest<AdminJournalArticle[]>('/admin/journal');
export const getJournalDraft = (id: string) =>
  adminRequest<AdminJournalArticle>(`/admin/journal/${encodeURIComponent(id)}`);
export const previewJournal = (id: string) =>
  adminRequest<PublishedJournalArticle>(`/admin/journal/${encodeURIComponent(id)}/preview`);
export const getSiteSettingsDraft = () => adminRequest<AdminSiteSettings>('/admin/settings/site');
export const getMediaReferenceReport = (id: string) =>
  adminRequest<MediaReferenceReport>(`/admin/media/${encodeURIComponent(id)}/references`);
