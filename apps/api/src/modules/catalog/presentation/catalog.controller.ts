import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { CatalogAdminRequest } from './admin-session.guard.js';
import { actorFromRequest, AdminSessionGuard, RequireAdminRoles } from './admin-session.guard.js';
import {
  AdminCategoryDto,
  AdminMediaDto,
  AdminPriceDto,
  AdminProductDto,
  CatalogQueryDto,
  InventoryActionDto,
} from './catalog.dto.js';
import { CatalogService } from '../application/catalog.service.js';
import { CatalogError } from '../application/catalog.error.js';
import type { CategoryValue, ProductDetailValue, ProductValue } from '../domain/catalog.types.js';

function requiredHeader(value: string | undefined, name: string): string {
  if (value === undefined || value.length < 1) {
    throw new CatalogError('validation', 'REQUIRED_HEADER_MISSING', `${name} is required.`);
  }
  return value;
}

function expectedVersion(value: string | undefined): number {
  const normalized = requiredHeader(value, 'If-Match').replaceAll('"', '');
  const version = Number.parseInt(normalized, 10);
  if (!Number.isInteger(version) || version < 1) {
    throw new CatalogError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match must contain a positive product version.',
    );
  }
  return version;
}

function toAdminProduct(product: ProductValue) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    details: product.details,
    categoryIds: product.categories.map((category) => category.id),
    seo: product.seo,
    status: product.status,
    version: product.version,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      normalizedColorCode: variant.normalizedColorCode,
      hex: variant.hex,
      displayOrder: variant.displayOrder,
      mediaIds: variant.gallery.map((media) => media.id),
      featuredMediaId: variant.featuredMediaId,
      status: variant.status,
      skus: variant.skus.map((sku) => ({
        id: sku.id,
        code: sku.code,
        normalizedSize: sku.normalizedSize,
        displaySize: sku.displaySize,
        amountRial: sku.price?.amountRial ?? 0,
        physicalQuantity: sku.inventory?.physicalQuantity ?? 0,
        status: sku.status,
      })),
    })),
  };
}

function toCategorySummary(category: CategoryValue) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    displayOrder: category.displayOrder,
  };
}

function toPublicProductDetail(product: ProductDetailValue) {
  return {
    ...product,
    categories: product.categories.map(toCategorySummary),
  };
}

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async listCategories() {
    return {
      items: (await this.catalog.listPublicCategories()).map(toCategorySummary),
    };
  }

  @Get('categories/:slug')
  async getCategory(@Param('slug') slug: string, @Query() query: CatalogQueryDto) {
    const result = await this.catalog.getPublicCategory(slug, query.toDomain());
    return {
      ...toCategorySummary(result.category),
      products: result.products,
      seo: {
        title: result.category.name,
        description: result.category.description,
      },
    };
  }

  @Get('products')
  listProducts(@Query() query: CatalogQueryDto) {
    return this.catalog.listPublicProducts(query.toDomain());
  }

  @Get('products/:slug')
  async getProduct(@Param('slug') slug: string, @Query('color') colorVariantId?: string) {
    return toPublicProductDetail(await this.catalog.getPublicProduct(slug, colorVariantId ?? null));
  }
}

@Controller('admin')
@UseGuards(AdminSessionGuard)
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  @RequireAdminRoles('super_admin')
  listCategories() {
    return this.catalog.listAdminCategories();
  }

  @Post('categories')
  @RequireAdminRoles('super_admin')
  createCategory(@Body() body: AdminCategoryDto, @Req() request: CatalogAdminRequest) {
    return this.catalog.createCategory(body.toDomain(), actorFromRequest(request));
  }

  @Get('media')
  @RequireAdminRoles('super_admin')
  listMedia() {
    return this.catalog.listMedia();
  }

  @Post('media')
  @RequireAdminRoles('super_admin')
  createMedia(@Body() body: AdminMediaDto, @Req() request: CatalogAdminRequest) {
    return this.catalog.createMedia(body.toDomain(), actorFromRequest(request));
  }

  @Get('products')
  @RequireAdminRoles('super_admin')
  async listProducts(@Query() query: CatalogQueryDto) {
    const products = await this.catalog.listAdminProducts(query.toDomain());
    return {
      items: products.map(toAdminProduct),
      page: { nextCursor: null, hasMore: false },
    };
  }

  @Post('products')
  @RequireAdminRoles('super_admin')
  async createProduct(@Body() body: AdminProductDto, @Req() request: CatalogAdminRequest) {
    return toAdminProduct(
      await this.catalog.createProduct(body.toDomain(), actorFromRequest(request)),
    );
  }

  @Get('products/:productId')
  @RequireAdminRoles('super_admin')
  async getProduct(@Param('productId') productId: string) {
    return toAdminProduct(await this.catalog.getAdminProduct(productId));
  }

  @Patch('products/:productId')
  @RequireAdminRoles('super_admin')
  async updateProduct(
    @Param('productId') productId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: AdminProductDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return toAdminProduct(
      await this.catalog.updateProduct(
        productId,
        body.toDomain(),
        expectedVersion(ifMatch),
        actorFromRequest(request),
      ),
    );
  }

  @Get('products/:productId/validation')
  @RequireAdminRoles('super_admin')
  validateProduct(@Param('productId') productId: string) {
    return this.catalog.validateProduct(productId);
  }

  @Get('products/:productId/preview')
  @RequireAdminRoles('super_admin')
  async previewProduct(@Param('productId') productId: string) {
    const preview = await this.catalog.previewProduct(productId);
    return {
      preview: preview.preview,
      product: toPublicProductDetail(preview.product),
    };
  }

  @Post('products/:productId/publish')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin')
  async publishProduct(
    @Param('productId') productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return toAdminProduct(
      await this.catalog.publishProduct(
        productId,
        requiredHeader(idempotencyKey, 'Idempotency-Key'),
        actorFromRequest(request),
      ),
    );
  }

  @Post('products/:productId/archive')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin')
  async archiveProduct(
    @Param('productId') productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return toAdminProduct(
      await this.catalog.archiveProduct(
        productId,
        requiredHeader(idempotencyKey, 'Idempotency-Key'),
        actorFromRequest(request),
      ),
    );
  }

  @Post('skus/:skuId/prices')
  @RequireAdminRoles('super_admin')
  createPrice(
    @Param('skuId') skuId: string,
    @Body() body: AdminPriceDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.catalog.createPrice(skuId, body.amountRial, body.reason, actorFromRequest(request));
  }

  @Get('inventory/:skuId')
  @RequireAdminRoles('super_admin', 'inventory_admin', 'instagram_admin')
  getInventory(@Param('skuId') skuId: string) {
    return this.catalog.getInventory(skuId);
  }

  @Post('inventory/:skuId/actions')
  @RequireAdminRoles('super_admin', 'inventory_admin', 'instagram_admin')
  applyInventoryAction(
    @Param('skuId') skuId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: InventoryActionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    const actor = actorFromRequest(request);
    if (
      actor.role === 'instagram_admin' &&
      body.action !== 'instagram_sale' &&
      body.action !== 'instagram_return'
    ) {
      throw new CatalogError(
        'forbidden',
        'INVENTORY_ACTION_FORBIDDEN',
        'Instagram administrator cannot perform this inventory action.',
      );
    }
    return this.catalog.applyInventoryAction(
      skuId,
      body.toDomain(),
      requiredHeader(idempotencyKey, 'Idempotency-Key'),
      actor,
    );
  }
}
