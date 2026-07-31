import type { CatalogRepository } from './catalog.repository.js';
import type {
  ActorContext,
  AdminCategoryInput,
  AdminMediaInput,
  AdminProductInput,
  CatalogQuery,
  InventoryActionInput,
} from '../domain/catalog.types.js';

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listPublicCategories() {
    return this.repository.listPublicCategories();
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
    return this.repository.createCategory(input, actor);
  }

  listMedia() {
    return this.repository.listMedia();
  }

  createMedia(input: AdminMediaInput, actor: ActorContext) {
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

  applyInventoryAction(
    skuId: string,
    input: InventoryActionInput,
    idempotencyKey: string,
    actor: ActorContext,
  ) {
    return this.repository.applyInventoryAction(skuId, input, idempotencyKey, actor);
  }
}
