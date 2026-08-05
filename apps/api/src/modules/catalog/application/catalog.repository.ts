import type {
  ActorContext,
  AdminCategoryInput,
  AdminMediaInput,
  AdminProductInput,
  CatalogQuery,
  CategoryValue,
  InventoryActionInput,
  InventoryValue,
  MediaValue,
  MoneyValue,
  ProductCardPageValue,
  ProductDetailValue,
  ProductValue,
  PublicationValidation,
} from '../domain/catalog.types.js';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogRepository {
  listPublicCategories(): Promise<CategoryValue[]>;
  listPublicOccasions(): Promise<CategoryValue[]>;
  getPublicCategory(
    slug: string,
    query: CatalogQuery,
  ): Promise<{ category: CategoryValue; products: ProductCardPageValue }>;
  listPublicProducts(query: CatalogQuery): Promise<ProductCardPageValue>;
  getPublicProduct(slug: string, colorVariantId: string | null): Promise<ProductDetailValue>;
  listAdminCategories(): Promise<CategoryValue[]>;
  createCategory(input: AdminCategoryInput, actor: ActorContext): Promise<CategoryValue>;
  updateCategory(
    id: string,
    input: AdminCategoryInput,
    expectedVersion: number,
    actor: ActorContext,
  ): Promise<CategoryValue>;
  listMedia(): Promise<MediaValue[]>;
  createMedia(input: AdminMediaInput, actor: ActorContext): Promise<MediaValue>;
  listAdminProducts(query: CatalogQuery): Promise<ProductValue[]>;
  getAdminProduct(id: string): Promise<ProductValue>;
  createProduct(input: AdminProductInput, actor: ActorContext): Promise<ProductValue>;
  updateProduct(
    id: string,
    input: AdminProductInput,
    expectedVersion: number,
    actor: ActorContext,
  ): Promise<ProductValue>;
  validateProduct(id: string): Promise<PublicationValidation>;
  previewProduct(id: string): Promise<ProductDetailValue>;
  publishProduct(id: string, idempotencyKey: string, actor: ActorContext): Promise<ProductValue>;
  archiveProduct(id: string, idempotencyKey: string, actor: ActorContext): Promise<ProductValue>;
  createPrice(
    skuId: string,
    amountRial: number,
    reason: string,
    actor: ActorContext,
  ): Promise<MoneyValue>;
  getInventory(skuId: string): Promise<InventoryValue>;
  applyInventoryAction(
    skuId: string,
    input: InventoryActionInput,
    idempotencyKey: string,
    actor: ActorContext,
  ): Promise<InventoryValue>;
}
