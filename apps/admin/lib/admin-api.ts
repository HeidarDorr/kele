import type { components } from '@kele/api-contract';
import { randomUUID } from 'node:crypto';

export type AdminProduct = components['schemas']['AdminProduct'];
export type AdminProductPage = components['schemas']['AdminProductPage'];
export type AdminCategory = components['schemas']['AdminCategory'];
export type MediaValue = components['schemas']['Media'];
export type PublicationValidation = components['schemas']['PublicationValidation'];
export type ProductPreview = components['schemas']['AdminProductPreview'];
export type Inventory = components['schemas']['Inventory'];

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const sessionToken =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';

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
  headers.set('cookie', `kele_session=${encodeURIComponent(sessionToken)}`);
  headers.set('x-correlation-id', randomUUID());
  if (init.body !== undefined && !headers.has('content-type')) {
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
