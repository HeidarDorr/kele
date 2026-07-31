'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { adminRequest, type AdminProduct, type Inventory } from '../lib/admin-api';

export interface ActionState {
  status: 'idle' | 'error';
  message: string;
}

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(formData: FormData, name: string): number {
  return Number(stringValue(formData, name));
}

function productPayload(formData: FormData, identifiers?: { variantId: string; skuId: string }) {
  const categoryIds = formData
    .getAll('categoryIds')
    .filter((value): value is string => typeof value === 'string');
  const mediaIds = formData
    .getAll('mediaIds')
    .filter((value): value is string => typeof value === 'string');
  const featuredMediaId = mediaIds[0] ?? '';
  return {
    name: stringValue(formData, 'name'),
    slug: stringValue(formData, 'slug'),
    description: stringValue(formData, 'description'),
    details: stringValue(formData, 'details')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    categoryIds,
    seo: {
      title: stringValue(formData, 'seoTitle') || null,
      description: stringValue(formData, 'seoDescription') || null,
    },
    variants: [
      {
        ...(identifiers ? { id: identifiers.variantId } : {}),
        name: stringValue(formData, 'variantName'),
        normalizedColorCode: stringValue(formData, 'normalizedColorCode'),
        hex: stringValue(formData, 'hex') || null,
        displayOrder: 0,
        mediaIds,
        featuredMediaId,
        skus: [
          {
            ...(identifiers ? { id: identifiers.skuId } : {}),
            code: stringValue(formData, 'skuCode').toUpperCase(),
            normalizedSize: stringValue(formData, 'normalizedSize'),
            displaySize: stringValue(formData, 'displaySize'),
            amountRial: numberValue(formData, 'amountRial'),
            physicalQuantity: numberValue(formData, 'physicalQuantity'),
          },
        ],
      },
    ],
  };
}

export async function createProductAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let product: AdminProduct;
  try {
    product = await adminRequest<AdminProduct>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productPayload(formData)),
    });
  } catch (error: unknown) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'ایجاد محصول ممکن نشد.',
    };
  }
  redirect(`/products/${product.id}/edit?notice=created`);
}

export async function updateProductAction(
  id: string,
  version: number,
  variantId: string,
  skuId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await adminRequest<AdminProduct>(`/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'if-match': String(version) },
      body: JSON.stringify(productPayload(formData, { variantId, skuId })),
    });
  } catch (error: unknown) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'ویرایش محصول ممکن نشد.',
    };
  }
  redirect(`/products/${id}/edit?notice=updated`);
}

export async function publishProductAction(id: string): Promise<void> {
  await adminRequest<AdminProduct>(`/admin/products/${id}/publish`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
  });
  redirect(`/products/${id}/edit?notice=published`);
}

export async function applyInventoryAction(skuId: string, formData: FormData): Promise<void> {
  await adminRequest<Inventory>(`/admin/inventory/${skuId}/actions`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      action: stringValue(formData, 'action'),
      quantity: numberValue(formData, 'quantity'),
      reason: stringValue(formData, 'reason'),
    }),
  });
  redirect(`/products/${stringValue(formData, 'productId')}/edit?notice=inventory`);
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await adminRequest('/admin/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: stringValue(formData, 'name'),
      slug: stringValue(formData, 'slug'),
      description: stringValue(formData, 'description') || null,
      displayOrder: numberValue(formData, 'displayOrder'),
      status: stringValue(formData, 'status'),
    }),
  });
  redirect('/?notice=category');
}

export async function createMediaAction(formData: FormData): Promise<void> {
  await adminRequest('/admin/media', {
    method: 'POST',
    body: JSON.stringify({
      url: stringValue(formData, 'url'),
      width: numberValue(formData, 'width'),
      height: numberValue(formData, 'height'),
      alt: stringValue(formData, 'alt'),
      format: stringValue(formData, 'format'),
      group: 'product_images',
      focalPoint: {
        x: numberValue(formData, 'focalPointX'),
        y: numberValue(formData, 'focalPointY'),
      },
    }),
  });
  redirect('/?notice=media');
}
