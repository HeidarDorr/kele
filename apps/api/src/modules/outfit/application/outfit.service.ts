import { formatIrrAsToman } from '@kele/design-system/money';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  OutfitCatalogPort,
  OutfitCatalogReferences,
} from '../../catalog/application/outfit-catalog.contract.js';
import { deriveOutfitAvailability, structuralOutfitErrors } from '../domain/outfit.js';
import type {
  OutfitAdminView,
  OutfitCardView,
  OutfitCheckoutSelection,
  OutfitComponentResolution,
  OutfitDetailView,
  OutfitDraftInput,
  OutfitMedia,
  OutfitRevisionRecord,
  OutfitValidation,
  OutfitValidationError,
} from '../domain/outfit.types.js';
import type { OutfitActor, OutfitRepository } from './outfit.repository.js';

function money(amountRial: number) {
  return { amountRial, currency: 'IRR' as const, display: formatIrrAsToman(amountRial) };
}

function referenceQuery(record: OutfitRevisionRecord) {
  return {
    categoryIds: record.categoryIds,
    mediaIds: record.media.map((item) => item.mediaId),
    productIds: record.items.map((item) => item.productId),
    variantIds: record.items.map((item) => item.defaultColorVariantId),
    skuIds: record.sizes.flatMap((size) => size.components.map((item) => item.skuId)),
  };
}

function adminView(record: OutfitRevisionRecord): OutfitAdminView {
  const featured = record.media.find((item) => item.featured);
  if (featured === undefined) throw new Error('Outfit revision has no featured media assignment.');
  return {
    id: record.outfitId,
    status: record.outfitStatus,
    version: record.outfitVersion,
    revisionId: record.revisionId,
    revisionNumber: record.revisionNumber,
    revisionState: record.revisionState,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    name: record.name,
    slug: record.slug,
    description: record.description,
    categoryIds: record.categoryIds,
    mediaIds: record.media.map((item) => item.mediaId),
    featuredMediaId: featured.mediaId,
    seo: record.seo,
    items: record.items,
    sizes: record.sizes,
  };
}

export class OutfitService {
  constructor(
    private readonly repository: OutfitRepository,
    private readonly catalog: OutfitCatalogPort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async listPublic(categorySlug: string | null): Promise<{
    items: OutfitCardView[];
    page: { nextCursor: null; hasMore: false };
  }> {
    const details = await Promise.all(
      (await this.repository.listPublic()).map((record) => this.toDetail(record, false)),
    );
    return {
      items: details
        .filter(
          (detail) =>
            categorySlug === null || detail.categories.some((item) => item.slug === categorySlug),
        )
        .map((detail) => ({
          id: detail.id,
          revisionId: detail.revisionId,
          revisionNumber: detail.revisionNumber,
          slug: detail.slug,
          name: detail.name,
          featuredMedia: detail.featuredMedia,
          startingPrice: detail.startingPrice,
          available: detail.available,
        })),
      page: { nextCursor: null, hasMore: false },
    };
  }

  async getPublic(slug: string): Promise<OutfitDetailView> {
    const record = await this.repository.getPublicBySlug(slug);
    if (record === null) this.notFound();
    return this.toDetail(record, false);
  }

  async listAdmin(
    status: 'draft' | 'published' | 'archived' | null,
  ): Promise<{ items: OutfitAdminView[]; page: { nextCursor: null; hasMore: false } }> {
    return {
      items: (await this.repository.listAdmin(status)).map(adminView),
      page: { nextCursor: null, hasMore: false },
    };
  }

  async getAdmin(outfitId: string): Promise<OutfitAdminView> {
    const record = await this.repository.getAdmin(outfitId);
    if (record === null) this.notFound();
    return adminView(record);
  }

  create(input: OutfitDraftInput, actor: OutfitActor): Promise<OutfitAdminView> {
    return this.unitOfWork.run(async () => {
      await this.assertWritableReferences(input);
      return adminView(await this.repository.create(input, actor));
    });
  }

  update(
    outfitId: string,
    input: OutfitDraftInput,
    expectedVersion: number,
    actor: OutfitActor,
  ): Promise<OutfitAdminView> {
    return this.unitOfWork.run(async () => {
      await this.assertWritableReferences(input);
      return adminView(await this.repository.replaceDraft(outfitId, input, expectedVersion, actor));
    });
  }

  async validate(outfitId: string): Promise<OutfitValidation> {
    const record = await this.repository.getAdmin(outfitId);
    if (record === null) this.notFound();
    const errors = await this.validationErrors(record, true);
    return { valid: errors.length === 0, errors };
  }

  publish(
    outfitId: string,
    expectedVersion: number,
    idempotencyKey: string,
    actor: OutfitActor,
  ): Promise<OutfitAdminView> {
    return this.unitOfWork.run(async () => {
      const record = await this.repository.getAdmin(outfitId, true);
      if (record === null) this.notFound();
      if (record.revisionState !== 'draft') {
        throw new ApplicationError('conflict', 'OUTFIT_DRAFT_REQUIRED', 'Outfit has no draft.');
      }
      const errors = await this.validationErrors(record, true);
      if (errors.length > 0) this.validationFailure(errors);
      return adminView(
        await this.repository.publish(
          outfitId,
          record.revisionId,
          expectedVersion,
          idempotencyKey,
          actor,
        ),
      );
    });
  }

  archive(outfitId: string, idempotencyKey: string, actor: OutfitActor): Promise<OutfitAdminView> {
    return this.unitOfWork.run(async () =>
      adminView(await this.repository.archive(outfitId, idempotencyKey, actor)),
    );
  }

  listRevisions(outfitId: string) {
    return this.repository.listRevisions(outfitId);
  }

  async preview(outfitId: string): Promise<{ preview: true; outfit: OutfitDetailView }> {
    const record = await this.repository.getAdmin(outfitId);
    if (record === null) this.notFound();
    return { preview: true, outfit: await this.toDetail(record, true) };
  }

  async getOutfitForCart(
    revisionId: string,
    size: string,
  ): Promise<OutfitCheckoutSelection | null> {
    const record = await this.repository.getPurchasableRevision(revisionId);
    if (record === null) return null;
    return this.resolve(record, size, false);
  }

  getOutfitForCheckout(revisionId: string, size: string): Promise<OutfitCheckoutSelection | null> {
    return this.getOutfitForCart(revisionId, size);
  }

  private async toDetail(
    record: OutfitRevisionRecord,
    allowDraft: boolean,
  ): Promise<OutfitDetailView> {
    const refs = await this.catalog.getOutfitReferences(referenceQuery(record));
    if (!allowDraft) {
      const errors = this.referenceErrors(record, refs, true);
      if (errors.length > 0) this.notFound();
    }
    const gallery = record.media
      .map((item) => refs.media.get(item.mediaId)?.value ?? null)
      .filter((item): item is OutfitMedia => item !== null);
    const featuredAssignment = record.media.find((item) => item.featured);
    const featured =
      featuredAssignment === undefined
        ? undefined
        : refs.media.get(featuredAssignment.mediaId)?.value;
    if (featured === undefined || gallery.length === 0) {
      throw new ApplicationError('validation', 'OUTFIT_MEDIA_MISSING', 'Outfit media is missing.');
    }
    const sizes = record.sizes.map((size) => {
      const resolved = this.resolveWithReferences(record, size.code, refs, allowDraft);
      return {
        code: size.code,
        label: size.label,
        price: money(size.amountRial),
        available: (resolved?.availableQuantity ?? 0) > 0,
        availableQuantity: resolved?.availableQuantity ?? 0,
      };
    });
    const categories = record.categoryIds
      .map((id) => refs.categories.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .toSorted((left, right) => left.displayOrder - right.displayOrder);
    const items = record.items.map((item) => {
      const product = refs.products.get(item.productId);
      const variant = refs.variants.get(item.defaultColorVariantId);
      if (product === undefined || variant === undefined || variant.featuredMedia === null) {
        throw new ApplicationError(
          'validation',
          'OUTFIT_ITEM_INCOMPLETE',
          'Outfit item presentation is incomplete.',
        );
      }
      return {
        id: item.id,
        productId: product.id,
        productSlug: product.slug,
        variantId: variant.id,
        name: product.name,
        colorName: variant.name,
        quantity: item.quantity,
        featuredMedia: variant.featuredMedia,
      };
    });
    const startingPrice = Math.min(...record.sizes.map((size) => size.amountRial));
    return {
      id: record.outfitId,
      revisionId: record.revisionId,
      revisionNumber: record.revisionNumber,
      slug: record.slug,
      name: record.name,
      featuredMedia: featured,
      startingPrice: money(startingPrice),
      available: sizes.some((size) => size.available),
      description: record.description,
      gallery,
      sizes,
      items,
      categories,
      seo: {
        title: record.seo.title,
        description: record.seo.description,
        canonicalPath: `/outfits/${record.slug}`,
      },
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async resolve(
    record: OutfitRevisionRecord,
    size: string,
    allowDraft: boolean,
  ): Promise<OutfitCheckoutSelection | null> {
    const refs = await this.catalog.getOutfitReferences(referenceQuery(record));
    return this.resolveWithReferences(record, size, refs, allowDraft);
  }

  private resolveWithReferences(
    record: OutfitRevisionRecord,
    sizeCode: string,
    refs: OutfitCatalogReferences,
    allowDraft: boolean,
  ): OutfitCheckoutSelection | null {
    const size = record.sizes.find((candidate) => candidate.code === sizeCode);
    if (size === undefined) return null;
    const itemById = new Map(record.items.map((item) => [item.id, item]));
    const components: OutfitComponentResolution[] = [];
    for (const component of size.components) {
      const item = itemById.get(component.outfitItemId);
      const product = item === undefined ? undefined : refs.products.get(item.productId);
      const variant =
        item === undefined ? undefined : refs.variants.get(item.defaultColorVariantId);
      const sku = refs.skus.get(component.skuId);
      if (
        item === undefined ||
        product === undefined ||
        variant === undefined ||
        sku === undefined
      ) {
        return null;
      }
      components.push({
        outfitItemId: item.id,
        skuId: sku.id,
        skuCode: sku.code,
        productName: product.name,
        colorName: variant.name,
        sizeLabel: sku.sizeLabel,
        quantityPerOutfit: component.quantity,
        availableQuantity: sku.availableQuantity,
        displayOrder: component.displayOrder,
      });
    }
    const availableQuantity = deriveOutfitAvailability(components);
    const featured = record.media.find((item) => item.featured);
    const image = featured === undefined ? null : (refs.media.get(featured.mediaId)?.value ?? null);
    const purchasable =
      record.outfitStatus === 'published' &&
      record.revisionState === 'published' &&
      this.referenceErrors(record, refs, true).length === 0;
    if (!allowDraft && !purchasable) return null;
    return {
      revisionId: record.revisionId,
      revisionNumber: record.revisionNumber,
      size: size.code,
      sizeLabel: size.label,
      title: record.name,
      unitPriceRial: size.amountRial,
      image,
      availableQuantity,
      purchasable,
      components,
    };
  }

  private async validationErrors(
    record: OutfitRevisionRecord,
    requirePublished: boolean,
  ): Promise<OutfitValidationError[]> {
    const refs = await this.catalog.getOutfitReferences(referenceQuery(record));
    return [
      ...structuralOutfitErrors({
        categoryIds: record.categoryIds,
        mediaIds: record.media.map((item) => item.mediaId),
        featuredMediaId: record.media.find((item) => item.featured)?.mediaId ?? '',
        items: record.items,
        sizes: record.sizes,
      }),
      ...this.referenceErrors(record, refs, requirePublished),
    ];
  }

  private referenceErrors(
    record: OutfitRevisionRecord,
    refs: OutfitCatalogReferences,
    requirePublished: boolean,
  ): OutfitValidationError[] {
    const errors: OutfitValidationError[] = [];
    for (const [index, id] of record.categoryIds.entries()) {
      const category = refs.categories.get(id);
      if (category === undefined || (requirePublished && !category.published)) {
        errors.push({
          path: `categoryIds.${String(index)}`,
          ruleId: 'PUB-009',
          message: 'Category must exist and be published.',
        });
      }
    }
    for (const [index, assignment] of record.media.entries()) {
      const media = refs.media.get(assignment.mediaId);
      if (media === undefined || media.archived) {
        errors.push({
          path: `mediaIds.${String(index)}`,
          ruleId: 'PUB-009',
          message: 'Editorial media must exist and remain active.',
        });
      }
    }
    const itemById = new Map(record.items.map((item) => [item.id, item]));
    for (const [index, item] of record.items.entries()) {
      const product = refs.products.get(item.productId);
      const variant = refs.variants.get(item.defaultColorVariantId);
      if (
        product === undefined ||
        variant === undefined ||
        variant.productId !== item.productId ||
        (requirePublished &&
          (!product.published || !variant.published || variant.featuredMedia === null))
      ) {
        errors.push({
          path: `items.${String(index)}`,
          ruleId: 'OTF-001',
          message: 'Item Product and default ColorVariant must be valid and published.',
        });
      }
    }
    for (const [sizeIndex, size] of record.sizes.entries()) {
      for (const [componentIndex, component] of size.components.entries()) {
        const item = itemById.get(component.outfitItemId);
        const sku = refs.skus.get(component.skuId);
        if (
          item === undefined ||
          sku === undefined ||
          sku.colorVariantId !== item.defaultColorVariantId ||
          component.quantity !== item.quantity ||
          (requirePublished && (!sku.published || !sku.hasInventory))
        ) {
          errors.push({
            path: `sizes.${String(sizeIndex)}.components.${String(componentIndex)}`,
            ruleId: 'OTF-014',
            message: 'Component must map the item quantity to an exact valid SKU.',
          });
        }
      }
    }
    return errors;
  }

  private async assertWritableReferences(input: OutfitDraftInput): Promise<void> {
    const structural = structuralOutfitErrors(input);
    const record = {
      items: input.items,
      sizes: input.sizes,
      categoryIds: input.categoryIds,
      media: input.mediaIds.map((mediaId, displayOrder) => ({
        mediaId,
        displayOrder,
        featured: mediaId === input.featuredMediaId,
      })),
    } as Pick<OutfitRevisionRecord, 'items' | 'sizes' | 'categoryIds' | 'media'>;
    const refs = await this.catalog.getOutfitReferences({
      categoryIds: input.categoryIds,
      mediaIds: input.mediaIds,
      productIds: input.items.map((item) => item.productId),
      variantIds: input.items.map((item) => item.defaultColorVariantId),
      skuIds: input.sizes.flatMap((size) => size.components.map((item) => item.skuId)),
    });
    const reference = this.referenceErrors(record as OutfitRevisionRecord, refs, false);
    if (structural.length + reference.length > 0)
      this.validationFailure([...structural, ...reference]);
  }

  private validationFailure(errors: readonly OutfitValidationError[]): never {
    throw new ApplicationError(
      'validation',
      'OUTFIT_PUBLICATION_INVALID',
      'Outfit revision is invalid.',
      errors.map((error) => ({ path: error.path, code: error.ruleId, message: error.message })),
    );
  }

  private notFound(): never {
    throw new ApplicationError('not_found', 'OUTFIT_NOT_FOUND', 'Outfit was not found.');
  }
}
