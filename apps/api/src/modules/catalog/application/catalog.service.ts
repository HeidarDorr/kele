import type { CatalogRepository } from './catalog.repository.js';
import type {
  ActorContext,
  AdminCategoryInput,
  AdminMediaInput,
  AdminProductInput,
  CatalogQuery,
  InventoryActionInput,
} from '../domain/catalog.types.js';
import { mediaReferenceIssues } from '../domain/media-reference.js';
import { CatalogError } from './catalog.error.js';

const inventoryActionsByRole: Readonly<
  Record<ActorContext['role'], readonly InventoryActionInput['action'][]>
> = {
  super_admin: [
    'production',
    'manual_correction',
    'damaged_goods',
    'instagram_sale',
    'instagram_return',
  ],
  inventory_admin: ['production', 'manual_correction', 'damaged_goods'],
  instagram_admin: ['instagram_sale', 'instagram_return'],
};

function normalizeInventoryAction(
  input: InventoryActionInput,
  actor: ActorContext,
): InventoryActionInput {
  if (!inventoryActionsByRole[actor.role].includes(input.action)) {
    throw new CatalogError(
      'forbidden',
      'INVENTORY_ACTION_FORBIDDEN',
      'This administrator role cannot perform the requested inventory action.',
    );
  }
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new CatalogError(
      'validation',
      'INVENTORY_REASON_INVALID',
      'An inventory reason of 3 to 500 characters is required.',
    );
  }
  return { ...input, reason };
}

function validatedCategory(input: AdminCategoryInput): AdminCategoryInput {
  if (input.discoveryKind === 'occasion' && input.status === 'published') {
    const missing = [
      ['editorialTitle', input.editorialTitle],
      ['editorialDescription', input.editorialDescription],
      ['heroMediaId', input.heroMediaId],
      ['seoTitle', input.seoTitle],
      ['seoDescription', input.seoDescription],
    ].filter(([, value]) => typeof value !== 'string' || value.trim().length === 0);
    if (missing.length > 0) {
      throw new CatalogError(
        'validation',
        'OCCASION_PUBLICATION_INVALID',
        `Published occasion content is incomplete: ${missing.map(([field]) => field).join(', ')}.`,
      );
    }
  }
  return input;
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listPublicCategories() {
    return this.repository.listPublicCategories();
  }

  listPublicOccasions() {
    return this.repository.listPublicOccasions();
  }

  getPublicCategory(slug: string, query: CatalogQuery) {
    return this.repository.getPublicCategory(slug, query);
  }

  listPublicProducts(query: CatalogQuery) {
    return this.repository.listPublicProducts(query);
  }

  getPublicProduct(slug: string, colorVariantId: string | null) {
    return this.repository.getPublicProduct(slug, colorVariantId);
  }

  listAdminCategories() {
    return this.repository.listAdminCategories();
  }

  createCategory(input: AdminCategoryInput, actor: ActorContext) {
    return this.repository.createCategory(validatedCategory(input), actor);
  }

  updateCategory(
    id: string,
    input: AdminCategoryInput,
    expectedVersion: number,
    actor: ActorContext,
  ) {
    return this.repository.updateCategory(id, validatedCategory(input), expectedVersion, actor);
  }

  listMedia() {
    return this.repository.listMedia();
  }

  createMedia(input: AdminMediaInput, actor: ActorContext) {
    const issues = mediaReferenceIssues(input);
    if (issues.length > 0) {
      throw new CatalogError(
        'validation',
        'MEDIA_REFERENCE_INVALID',
        'Media metadata failed security validation.',
        issues.map((message) => ({ path: 'url', code: 'MEDIA_REFERENCE_INVALID', message })),
      );
    }
    return this.repository.createMedia(input, actor);
  }

  listAdminProducts(query: CatalogQuery) {
    return this.repository.listAdminProducts(query);
  }

  getAdminProduct(id: string) {
    return this.repository.getAdminProduct(id);
  }

  createProduct(input: AdminProductInput, actor: ActorContext) {
    return this.repository.createProduct(input, actor);
  }

  updateProduct(
    id: string,
    input: AdminProductInput,
    expectedVersion: number,
    actor: ActorContext,
  ) {
    return this.repository.updateProduct(id, input, expectedVersion, actor);
  }

  validateProduct(id: string) {
    return this.repository.validateProduct(id);
  }

  async previewProduct(id: string) {
    return { preview: true as const, product: await this.repository.previewProduct(id) };
  }

  publishProduct(id: string, idempotencyKey: string, actor: ActorContext) {
    return this.repository.publishProduct(id, idempotencyKey, actor);
  }

  archiveProduct(id: string, idempotencyKey: string, actor: ActorContext) {
    return this.repository.archiveProduct(id, idempotencyKey, actor);
  }

  createPrice(skuId: string, amountRial: number, reason: string, actor: ActorContext) {
    return this.repository.createPrice(skuId, amountRial, reason, actor);
  }

  getInventory(skuId: string) {
    return this.repository.getInventory(skuId);
  }

  async applyInventoryAction(
    skuId: string,
    input: InventoryActionInput,
    idempotencyKey: string,
    actor: ActorContext,
  ) {
    return this.repository.applyInventoryAction(
      skuId,
      normalizeInventoryAction(input, actor),
      idempotencyKey,
      actor,
    );
  }
}
