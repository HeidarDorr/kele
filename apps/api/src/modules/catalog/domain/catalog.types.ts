export type PublicationStatus = 'draft' | 'published' | 'archived';

export interface SeoValue {
  title: string | null;
  description: string | null;
}

export interface MediaValue {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: { x: number; y: number };
}

export interface MoneyValue {
  amountRial: number;
  currency: 'IRR';
  display: string;
}

export interface InventoryValue {
  skuId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  version: number;
}

export interface SkuValue {
  id: string;
  code: string;
  normalizedSize: string;
  displaySize: string;
  status: PublicationStatus;
  price: MoneyValue | null;
  inventory: InventoryValue | null;
}

export interface ColorVariantValue {
  id: string;
  name: string;
  normalizedColorCode: string;
  hex: string | null;
  status: PublicationStatus;
  displayOrder: number;
  gallery: MediaValue[];
  featuredMediaId: string | null;
  skus: SkuValue[];
}

export interface CategoryValue {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: PublicationStatus;
  version: number;
  discoveryKind?: 'catalog' | 'occasion';
  editorialTitle?: string | null;
  editorialDescription?: string | null;
  heroMedia?: MediaValue | null;
  seo?: SeoValue;
}

export interface ProductValue {
  id: string;
  name: string;
  slug: string;
  description: string;
  details: string[];
  status: PublicationStatus;
  seo: SeoValue;
  version: number;
  updatedAt: string;
  categories: CategoryValue[];
  variants: ColorVariantValue[];
}

export interface ProductCardValue {
  productId: string;
  slug: string;
  name: string;
  selectedVariant: {
    id: string;
    name: string;
    featuredMedia: MediaValue;
  };
  availableColors: Array<{
    variantId: string;
    name: string;
    hex: string | null;
    available: boolean;
  }>;
  price: MoneyValue;
  available: boolean;
}

export interface ProductCardPageValue {
  items: ProductCardValue[];
  page: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface ProductDetailValue extends ProductCardValue {
  description: string;
  details: string[];
  variants: Array<{
    id: string;
    name: string;
    gallery: MediaValue[];
    skus: Array<{
      id: string;
      code: string;
      size: string;
      available: boolean;
      price: MoneyValue;
    }>;
  }>;
  categories: CategoryValue[];
  seo: SeoValue;
  updatedAt: string;
}

export interface AdminSkuInput {
  id?: string;
  code: string;
  normalizedSize: string;
  displaySize: string;
  amountRial: number;
  physicalQuantity: number;
  status?: PublicationStatus;
}

export interface AdminColorVariantInput {
  id?: string;
  name: string;
  normalizedColorCode: string;
  hex: string | null;
  displayOrder: number;
  mediaIds: string[];
  featuredMediaId: string;
  skus: AdminSkuInput[];
  status?: PublicationStatus;
}

export interface AdminProductInput {
  name: string;
  slug: string;
  description: string;
  details: string[];
  categoryIds: string[];
  seo: SeoValue;
  variants: AdminColorVariantInput[];
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: PublicationStatus;
  discoveryKind?: 'catalog' | 'occasion';
  editorialTitle?: string | null;
  editorialDescription?: string | null;
  heroMediaId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface AdminMediaInput {
  url: string;
  width: number;
  height: number;
  alt: string;
  format: 'jpg' | 'png' | 'webp';
  group: 'product_images' | 'outfit_editorial' | 'homepage' | 'journal' | 'shared_assets';
  focalPoint: { x: number; y: number };
}

export interface CatalogQuery {
  category: string | null;
  search: string | null;
  sort: 'newest' | 'price_asc' | 'price_desc';
  limit: number;
  cursor: string | null;
}

export interface ActorContext {
  actorId: string;
  role: 'super_admin' | 'inventory_admin' | 'instagram_admin';
  correlationId: string;
}

export interface PublicationValidationError {
  path: string;
  ruleId: `CAT-${string}` | `PUB-${string}`;
  message: string;
}

export interface PublicationValidation {
  valid: boolean;
  errors: PublicationValidationError[];
}

export interface InventoryActionInput {
  action:
    | 'production'
    | 'sale'
    | 'manual_correction'
    | 'damaged_goods'
    | 'instagram_sale'
    | 'instagram_return';
  quantity: number;
  reason: string;
}
