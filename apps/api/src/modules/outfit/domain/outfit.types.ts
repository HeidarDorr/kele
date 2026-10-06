export type OutfitMedia = Readonly<{
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: Readonly<{ x: number; y: number }>;
}>;

export type OutfitMoney = Readonly<{
  amountRial: number;
  currency: 'IRR';
  display: string;
}>;

export type OutfitDraftInput = Readonly<{
  name: string;
  slug: string;
  description: string;
  categoryIds: readonly string[];
  mediaIds: readonly string[];
  featuredMediaId: string;
  seo: Readonly<{ title: string | null; description: string | null }>;
  items: ReadonlyArray<{
    id: string;
    productId: string;
    defaultColorVariantId: string;
    quantity: number;
    displayOrder: number;
  }>;
  sizes: ReadonlyArray<{
    code: string;
    label: string;
    amountRial: number;
    displayOrder: number;
    components: ReadonlyArray<{
      outfitItemId: string;
      skuId: string;
      quantity: number;
      displayOrder: number;
    }>;
  }>;
}>;

export type OutfitRevisionRecord = Readonly<{
  outfitId: string;
  slug: string;
  outfitStatus: 'draft' | 'published' | 'archived';
  outfitVersion: number;
  revisionId: string;
  revisionNumber: number;
  revisionState: 'draft' | 'published' | 'historical';
  revisionVersion: number;
  name: string;
  description: string;
  categoryIds: readonly string[];
  media: ReadonlyArray<{ mediaId: string; displayOrder: number; featured: boolean }>;
  seo: Readonly<{ title: string | null; description: string | null }>;
  items: OutfitDraftInput['items'];
  sizes: OutfitDraftInput['sizes'];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OutfitValidationError = Readonly<{
  path: string;
  ruleId: string;
  message: string;
}>;

export type OutfitValidation = Readonly<{
  valid: boolean;
  errors: readonly OutfitValidationError[];
}>;

export type OutfitComponentResolution = Readonly<{
  outfitItemId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  colorName: string;
  sizeLabel: string;
  quantityPerOutfit: number;
  unitPriceRial: number | null;
  availableQuantity: number;
  displayOrder: number;
}>;

export type OutfitCheckoutSelection = Readonly<{
  revisionId: string;
  revisionNumber: number;
  size: string;
  sizeLabel: string;
  title: string;
  unitPriceRial: number;
  image: OutfitMedia | null;
  availableQuantity: number;
  purchasable: boolean;
  components: readonly OutfitComponentResolution[];
}>;

export type OutfitCardView = Readonly<{
  id: string;
  revisionId: string;
  revisionNumber: number;
  slug: string;
  name: string;
  featuredMedia: OutfitMedia;
  secondaryMedia: OutfitMedia | null;
  startingPrice: OutfitMoney;
  available: boolean;
}>;

export type OutfitDetailView = OutfitCardView &
  Readonly<{
    description: string;
    gallery: readonly OutfitMedia[];
    sizes: ReadonlyArray<{
      code: string;
      label: string;
      price: OutfitMoney;
      available: boolean;
      availableQuantity: number;
      components: ReadonlyArray<{
        outfitItemId: string;
        skuId: string;
        name: string;
        colorName: string;
        sizeLabel: string;
        quantity: number;
        available: boolean;
        availableQuantity: number;
        skuAvailableQuantity: number;
        price: OutfitMoney | null;
      }>;
    }>;
    items: ReadonlyArray<{
      id: string;
      productId: string;
      productSlug: string;
      variantId: string;
      name: string;
      colorName: string;
      quantity: number;
      featuredMedia: OutfitMedia;
    }>;
    categories: ReadonlyArray<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      displayOrder: number;
    }>;
    seo: Readonly<{ title: string | null; description: string | null; canonicalPath: string }>;
    updatedAt: string;
  }>;

export type OutfitAdminView = Readonly<{
  id: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  revisionId: string;
  revisionNumber: number;
  revisionState: 'draft' | 'published' | 'historical';
  publishedAt: string | null;
}> &
  OutfitDraftInput;

export type OutfitAdminSummaryView = Readonly<{
  id: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  revisionId: string;
  revisionNumber: number;
  revisionState: 'draft' | 'published' | 'historical';
  publishedAt: string | null;
  name: string;
  slug: string;
  itemCount: number;
  sizeCount: number;
  mediaCount: number;
  hasFeaturedMedia: boolean;
}>;

export type OutfitRevisionSummary = Readonly<{
  id: string;
  revisionNumber: number;
  state: 'draft' | 'published' | 'historical';
  name: string;
  publishedAt: string | null;
  createdAt: string;
}>;
