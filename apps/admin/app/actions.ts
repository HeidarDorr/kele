'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import {
  adminRequest,
  type AdminOutfit,
  type AdminProduct,
  type Inventory,
} from '../lib/admin-api';
import { ensureInternalColorCodes } from '../lib/product-variant-code';

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

function productPayload(formData: FormData) {
  const categoryIds = formData
    .getAll('categoryIds')
    .filter((value): value is string => typeof value === 'string');
  const variants = ensureInternalColorCodes(
    JSON.parse(stringValue(formData, 'productModel')) as Array<
      Omit<AdminProduct['variants'][number], 'normalizedColorCode'> & {
        normalizedColorCode?: string;
      }
    >,
  );
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
    variants,
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
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await adminRequest<AdminProduct>(`/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'if-match': String(version) },
      body: JSON.stringify(productPayload(formData)),
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

export async function applyInventoryAction(formData: FormData): Promise<void> {
  const skuId = stringValue(formData, 'skuId');
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
      colorHex: stringValue(formData, 'colorHex') || null,
      focalPoint: {
        x: numberValue(formData, 'focalPointX'),
        y: numberValue(formData, 'focalPointY'),
      },
    }),
  });
  redirect('/?notice=media');
}

export async function uploadMediaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size < 1) {
    return { status: 'error', message: 'یک فایل تصویر انتخاب کنید.' };
  }
  const upload = new FormData();
  upload.set('file', file, file.name);
  upload.set('alt', stringValue(formData, 'alt'));
  upload.set('group', stringValue(formData, 'group'));
  upload.set('focalPointX', stringValue(formData, 'focalPointX') || '0.5');
  upload.set('focalPointY', stringValue(formData, 'focalPointY') || '0.5');
  try {
    await adminRequest('/admin/media/uploads', { method: 'POST', body: upload });
  } catch (error: unknown) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'بارگذاری رسانه ممکن نشد.',
    };
  }
  redirect('/editorial/media?notice=uploaded');
}

function outfitPayload(formData: FormData) {
  const model = JSON.parse(stringValue(formData, 'outfitModel')) as Pick<
    AdminOutfit,
    'items' | 'sizes'
  >;
  const categoryIds = formData
    .getAll('categoryIds')
    .filter((value): value is string => typeof value === 'string');
  const mediaIds = formData
    .getAll('mediaIds')
    .filter((value): value is string => typeof value === 'string');
  return {
    name: stringValue(formData, 'name'),
    slug: stringValue(formData, 'slug'),
    description: stringValue(formData, 'description'),
    categoryIds,
    mediaIds,
    featuredMediaId: mediaIds[0] ?? '',
    seo: {
      title: stringValue(formData, 'seoTitle') || null,
      description: stringValue(formData, 'seoDescription') || null,
    },
    items: model.items,
    sizes: model.sizes,
  };
}

export async function createOutfitAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let outfit: AdminOutfit;
  try {
    outfit = await adminRequest<AdminOutfit>('/admin/outfits', {
      method: 'POST',
      body: JSON.stringify(outfitPayload(formData)),
    });
  } catch (error: unknown) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'ساخت پیش‌نویس ست ممکن نشد.',
    };
  }
  redirect(`/outfits/${outfit.id}/edit?notice=created`);
}

export async function updateOutfitAction(
  id: string,
  version: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await adminRequest<AdminOutfit>(`/admin/outfits/${id}`, {
      method: 'PATCH',
      headers: { 'if-match': `"${String(version)}"` },
      body: JSON.stringify(outfitPayload(formData)),
    });
  } catch (error: unknown) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'ویرایش ست ممکن نشد.',
    };
  }
  redirect(`/outfits/${id}/edit?notice=updated`);
}

export async function publishOutfitAction(id: string, version: number): Promise<void> {
  await adminRequest<AdminOutfit>(`/admin/outfits/${id}/publish`, {
    method: 'POST',
    headers: {
      'if-match': `"${String(version)}"`,
      'idempotency-key': randomUUID(),
    },
  });
  redirect(`/outfits/${id}/edit?notice=published`);
}

export async function archiveOutfitAction(id: string): Promise<void> {
  await adminRequest<AdminOutfit>(`/admin/outfits/${id}/archive`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
  });
  redirect('/outfits?notice=archived');
}

export async function transitionOrderAction(
  orderNumber: string,
  version: number,
  formData: FormData,
): Promise<void> {
  const toStatus = stringValue(formData, 'toStatus');
  const trackingNumber = stringValue(formData, 'trackingNumber');
  await adminRequest(`/admin/orders/${encodeURIComponent(orderNumber)}/transitions`, {
    method: 'POST',
    headers: {
      'if-match': `"${String(version)}"`,
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({
      toStatus,
      reason: stringValue(formData, 'reason'),
      ...(toStatus === 'shipped'
        ? {
            tracking: {
              carrier: stringValue(formData, 'carrier'),
              trackingNumber,
              trackingUrl: stringValue(formData, 'trackingUrl') || null,
            },
          }
        : {}),
    }),
  });
  redirect(
    `/operations/orders/${encodeURIComponent(orderNumber)}?notice=transitioned&transition=${encodeURIComponent(toStatus)}`,
  );
}

export async function reviseTrackingAction(
  orderNumber: string,
  version: number,
  formData: FormData,
): Promise<void> {
  await adminRequest(`/admin/orders/${encodeURIComponent(orderNumber)}/tracking`, {
    method: 'POST',
    headers: {
      'if-match': `"${String(version)}"`,
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({
      carrier: stringValue(formData, 'carrier'),
      trackingNumber: stringValue(formData, 'trackingNumber'),
      trackingUrl: stringValue(formData, 'trackingUrl') || null,
      reason: stringValue(formData, 'reason'),
    }),
  });
  redirect(`/operations/orders/${encodeURIComponent(orderNumber)}?notice=tracking`);
}

export async function decideReturnAction(
  returnId: string,
  decision: 'approve' | 'reject',
  formData: FormData,
): Promise<void> {
  await adminRequest(`/admin/returns/${encodeURIComponent(returnId)}/${decision}`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
    body: JSON.stringify({ reason: stringValue(formData, 'reason') }),
  });
  redirect('/operations/returns?notice=decided');
}

export async function retryRefundAction(refundId: string, orderNumber: string): Promise<void> {
  await adminRequest(`/admin/refunds/${encodeURIComponent(refundId)}/retry`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID() },
    body: JSON.stringify({ reason: 'تلاش مجدد کنترل‌شده توسط اپراتور' }),
  });
  redirect(`/operations/orders/${encodeURIComponent(orderNumber)}?notice=refund`);
}

export async function previewBulkAction(formData: FormData): Promise<void> {
  const kind = stringValue(formData, 'kind');
  const skuIds = stringValue(formData, 'skuIds')
    .split(/[,\s]+/u)
    .map((value) => value.trim())
    .filter(Boolean);
  const common = { filters: { skuIds }, reason: stringValue(formData, 'reason') };
  const body =
    kind === 'price'
      ? {
          ...common,
          adjustment: {
            type: stringValue(formData, 'adjustmentType'),
            value: numberValue(formData, 'value'),
          },
        }
      : {
          ...common,
          action: stringValue(formData, 'inventoryAction'),
          quantity: numberValue(formData, 'value'),
        };
  const operation = await adminRequest<{ id: string }>(`/admin/bulk-operations/${kind}/preview`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  redirect(`/operations/bulk?preview=${encodeURIComponent(operation.id)}`);
}

export async function applyBulkAction(id: string, version: number): Promise<void> {
  await adminRequest(`/admin/bulk-operations/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
    headers: {
      'if-match': `"${String(version)}"`,
      'idempotency-key': randomUUID(),
    },
  });
  redirect(`/operations/bulk?preview=${encodeURIComponent(id)}&notice=applied`);
}

function lines(formData: FormData, name: string): string[] {
  return stringValue(formData, name)
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function saveHomepageAction(version: number, formData: FormData): Promise<void> {
  const sectionIds = formData
    .getAll('sectionId')
    .filter((value): value is string => typeof value === 'string');
  const sections = sectionIds.map((id) => {
    const type = stringValue(formData, `type:${id}`);
    const mediaSection = ['hero', 'editorial_banner', 'brand_story'].includes(type);
    const outfitId = type === 'hero' ? stringValue(formData, `outfitId:${id}`) || null : null;
    return {
      id,
      type,
      enabled: formData.get(`enabled:${id}`) === 'on',
      order: numberValue(formData, `order:${id}`),
      content: mediaSection
        ? {
            title: stringValue(formData, `title:${id}`),
            subtitle: stringValue(formData, `subtitle:${id}`) || null,
            mediaId: stringValue(formData, `mediaId:${id}`),
            ctaLabel: stringValue(formData, `ctaLabel:${id}`) || null,
            href: outfitId === null ? stringValue(formData, `href:${id}`) || null : null,
            outfitId,
          }
        : {
            title: stringValue(formData, `title:${id}`),
            referenceIds: formData
              .getAll(`referenceIds:${id}`)
              .filter((value): value is string => typeof value === 'string')
              .flatMap((value) => value.split(/[\s,]+/u))
              .map((value) => value.trim())
              .filter(Boolean),
          },
    };
  });
  await adminRequest('/admin/homepage', {
    method: 'PUT',
    headers: { 'if-match': `"${String(version)}"` },
    body: JSON.stringify({ sections }),
  });
  redirect('/editorial/homepage?notice=saved');
}

export async function publishHomepageAction(version: number): Promise<void> {
  await adminRequest('/admin/homepage/publish', {
    method: 'POST',
    headers: { 'if-match': `"${String(version)}"` },
  });
  redirect('/editorial/homepage?notice=published');
}

function journalPayload(formData: FormData) {
  const blockIds = formData
    .getAll('blockId')
    .filter((value): value is string => typeof value === 'string');
  const blocks = blockIds.map((id) => {
    const type = stringValue(formData, `blockType:${id}`);
    if (type === 'heading')
      return {
        id,
        type,
        level: numberValue(formData, `blockLevel:${id}`),
        text: stringValue(formData, `blockText:${id}`),
      };
    if (type === 'ordered_list' || type === 'unordered_list')
      return { id, type, items: lines(formData, `blockItems:${id}`) };
    if (type === 'image') return { id, type, mediaId: stringValue(formData, `blockMediaId:${id}`) };
    if (type === 'product_reference' || type === 'outfit_reference')
      return {
        id,
        type,
        referenceId: stringValue(formData, `blockReferenceId:${id}`),
        label: stringValue(formData, `blockLabel:${id}`) || undefined,
      };
    if (type === 'external_link')
      return {
        id,
        type,
        label: stringValue(formData, `blockLabel:${id}`),
        href: stringValue(formData, `blockHref:${id}`),
      };
    if (type === 'divider') return { id, type };
    return { id, type, text: stringValue(formData, `blockText:${id}`) };
  });
  return {
    slug: stringValue(formData, 'slug'),
    title: stringValue(formData, 'title'),
    excerpt: stringValue(formData, 'excerpt') || null,
    coverMediaId: stringValue(formData, 'coverMediaId') || null,
    blocks,
    seoTitle: stringValue(formData, 'seoTitle') || null,
    seoDescription: stringValue(formData, 'seoDescription') || null,
  };
}

export async function createJournalAction(formData: FormData): Promise<void> {
  const article = await adminRequest<{ id: string }>('/admin/journal', {
    method: 'POST',
    body: JSON.stringify(journalPayload(formData)),
  });
  redirect(`/editorial/journal/${article.id}?notice=created`);
}

export async function saveJournalAction(
  id: string,
  version: number,
  formData: FormData,
): Promise<void> {
  await adminRequest(`/admin/journal/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'if-match': `"${String(version)}"` },
    body: JSON.stringify(journalPayload(formData)),
  });
  redirect(`/editorial/journal/${id}?notice=saved`);
}

export async function publishJournalAction(id: string, version: number): Promise<void> {
  await adminRequest(`/admin/journal/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: { 'if-match': `"${String(version)}"` },
  });
  redirect(`/editorial/journal/${id}?notice=published`);
}

export async function archiveJournalAction(id: string, version: number): Promise<void> {
  await adminRequest(`/admin/journal/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'if-match': `"${String(version)}"` },
  });
  redirect('/editorial/journal?notice=archived');
}

function navigationLines(formData: FormData, name: string) {
  return lines(formData, name).map((line) => {
    const delimiter = line.indexOf('|');
    return {
      label: delimiter >= 0 ? line.slice(0, delimiter).trim() : line,
      href: delimiter >= 0 ? line.slice(delimiter + 1).trim() : '',
    };
  });
}

export async function saveSiteSettingsAction(version: number, formData: FormData): Promise<void> {
  const announcementKind = stringValue(formData, 'announcementKind');
  await adminRequest('/admin/settings/site', {
    method: 'PUT',
    headers: { 'if-match': `"${String(version)}"` },
    body: JSON.stringify({
      configuration: {
        brandName: stringValue(formData, 'brandName'),
        brandTagline: stringValue(formData, 'brandTagline'),
        contactEmail: stringValue(formData, 'contactEmail') || null,
        primaryNavigation: navigationLines(formData, 'primaryNavigation'),
        footerNavigation: navigationLines(formData, 'footerNavigation'),
        announcement: stringValue(formData, 'announcement') || null,
        announcementKind: announcementKind || null,
        seoDefaults: {
          title: stringValue(formData, 'seoTitle'),
          description: stringValue(formData, 'seoDescription'),
        },
      },
      contentApprovedBy: stringValue(formData, 'contentApprovedBy') || null,
      contentApprovedAt: stringValue(formData, 'contentApprovedAt') || null,
    }),
  });
  redirect('/editorial/settings?notice=saved');
}

export async function publishSiteSettingsAction(version: number): Promise<void> {
  await adminRequest('/admin/settings/site/publish', {
    method: 'POST',
    headers: { 'if-match': `"${String(version)}"` },
  });
  redirect('/editorial/settings?notice=published');
}

export async function updateDiscoveryAction(
  id: string,
  version: number,
  formData: FormData,
): Promise<void> {
  await adminRequest(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'if-match': `"${String(version)}"` },
    body: JSON.stringify({
      name: stringValue(formData, 'name'),
      slug: stringValue(formData, 'slug'),
      description: stringValue(formData, 'description') || null,
      displayOrder: numberValue(formData, 'displayOrder'),
      status: stringValue(formData, 'status'),
      discoveryKind: 'occasion',
      editorialTitle: stringValue(formData, 'editorialTitle') || null,
      editorialDescription: stringValue(formData, 'editorialDescription') || null,
      heroMediaId: stringValue(formData, 'heroMediaId') || null,
      seoTitle: stringValue(formData, 'seoTitle') || null,
      seoDescription: stringValue(formData, 'seoDescription') || null,
    }),
  });
  redirect('/editorial/discovery?notice=saved');
}

export async function deleteEditorialMediaAction(id: string): Promise<void> {
  await adminRequest(`/admin/media/${encodeURIComponent(id)}/references`, { method: 'DELETE' });
  redirect('/editorial/media?notice=deleted');
}
