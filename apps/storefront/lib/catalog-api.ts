import type { components } from '@kele/api-contract';

export type Category = components['schemas']['CategorySummary'];
export type CategoryPage = components['schemas']['CategoryPage'];
export type CategoryDetail = components['schemas']['CategoryDetail'];
export type ProductCardValue = components['schemas']['ProductCard'];
export type ProductCardPage = components['schemas']['ProductCardPage'];
export type ProductDetail = components['schemas']['ProductDetail'];
export type OutfitCardValue = components['schemas']['OutfitCard'];
export type OutfitCardPage = components['schemas']['OutfitCardPage'];
export type OutfitDetail = components['schemas']['OutfitDetail'];
export type MediaValue = components['schemas']['Media'];

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

export class CatalogApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new CatalogApiError(
      response.status,
      `Catalog request failed with ${String(response.status)}.`,
    );
  }
  return (await response.json()) as T;
}

export function getCategories(): Promise<CategoryPage> {
  return request<CategoryPage>('/catalog/categories');
}

export function getCategory(
  slug: string,
  parameters: { search?: string; limit?: number } = {},
): Promise<CategoryDetail> {
  const query = new URLSearchParams();
  if (parameters.search) query.set('search', parameters.search);
  if (parameters.limit) query.set('limit', String(parameters.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return request<CategoryDetail>(`/catalog/categories/${encodeURIComponent(slug)}${suffix}`);
}

export function getProducts(
  parameters: {
    search?: string;
    category?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc';
    limit?: number;
  } = {},
): Promise<ProductCardPage> {
  const query = new URLSearchParams();
  if (parameters.search) query.set('search', parameters.search);
  if (parameters.category) query.set('category', parameters.category);
  if (parameters.sort) query.set('sort', parameters.sort);
  if (parameters.limit) query.set('limit', String(parameters.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return request<ProductCardPage>(`/catalog/products${suffix}`);
}

export function getProduct(slug: string, color?: string): Promise<ProductDetail> {
  const suffix = color ? `?color=${encodeURIComponent(color)}` : '';
  return request<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}${suffix}`);
}

export function getOutfits(category?: string): Promise<OutfitCardPage> {
  const suffix = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<OutfitCardPage>(`/catalog/outfits${suffix}`);
}

export function getOutfit(slug: string): Promise<OutfitDetail> {
  return request<OutfitDetail>(`/catalog/outfits/${encodeURIComponent(slug)}`);
}
