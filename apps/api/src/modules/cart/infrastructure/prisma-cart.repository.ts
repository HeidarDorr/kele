import {
  CartLineKind,
  CartLineStatus,
  CartNoticeCode,
  CartStatus,
  Prisma,
  type Cart,
  type CartLine,
  type CartNotice,
} from '@prisma/client';
import type {
  CartCatalogMedia,
  CartCatalogProduct,
} from '../../catalog/application/cart-catalog.contract.js';
import { ApplicationError } from '../../../shared/application-error.js';
import {
  PrismaTransactionContext,
  type DatabaseClient,
} from '../../../infrastructure/prisma/prisma-transaction.context.js';
import type { CartRepository } from '../application/cart.repository.js';
import type { OutfitCartSelection } from '../application/outfit-cart.contract.js';
import type {
  CartLineRecord,
  CartNoticeCodeValue,
  CartNoticeRecord,
  CartRecord,
  MergeInstruction,
} from '../domain/cart.types.js';

const cartInclude = {
  lines: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
  notices: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.CartInclude;

type CartWithRelations = Cart & { lines: CartLine[]; notices: CartNotice[] };

const toLineStatus: Record<'available' | 'unavailable' | 'requires_review', CartLineStatus> = {
  available: CartLineStatus.AVAILABLE,
  unavailable: CartLineStatus.UNAVAILABLE,
  requires_review: CartLineStatus.REQUIRES_REVIEW,
};
const fromLineStatus: Record<CartLineStatus, CartLineRecord['status']> = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  REQUIRES_REVIEW: 'requires_review',
};
const toNoticeCode: Record<CartNoticeCodeValue, CartNoticeCode> = {
  quantity_reduced_to_inventory: CartNoticeCode.QUANTITY_REDUCED_TO_INVENTORY,
  sku_unavailable: CartNoticeCode.SKU_UNAVAILABLE,
  outfit_revision_requires_review: CartNoticeCode.OUTFIT_REVISION_REQUIRES_REVIEW,
};
const fromNoticeCode: Record<CartNoticeCode, CartNoticeCodeValue> = {
  QUANTITY_REDUCED_TO_INVENTORY: 'quantity_reduced_to_inventory',
  SKU_UNAVAILABLE: 'sku_unavailable',
  OUTFIT_REVISION_REQUIRES_REVIEW: 'outfit_revision_requires_review',
};

function safeInteger(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('Cart price exceeds safe integer range.');
  return result;
}

function isMedia(value: Prisma.JsonValue | null): value is Prisma.JsonObject & CartCatalogMedia {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  const focalPoint = value.focalPoint;
  return (
    typeof value.id === 'string' &&
    typeof value.url === 'string' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.alt === 'string' &&
    focalPoint !== null &&
    !Array.isArray(focalPoint) &&
    typeof focalPoint === 'object' &&
    typeof focalPoint.x === 'number' &&
    typeof focalPoint.y === 'number'
  );
}

function mapCartLine(line: CartLine): CartLineRecord {
  return {
    id: line.id,
    cartId: line.cartId,
    kind: line.kind === CartLineKind.PRODUCT ? 'product' : 'outfit',
    skuId: line.skuId,
    outfitRevisionId: line.outfitRevisionId,
    outfitRevisionNumber: line.outfitRevisionNumber,
    outfitSize: line.outfitSize,
    titleSnapshot: line.titleSnapshot,
    selectionSnapshot: line.selectionSnapshot,
    skuCodeSnapshot: line.skuCodeSnapshot,
    imageSnapshot: isMedia(line.imageSnapshot) ? line.imageSnapshot : null,
    quantity: line.quantity,
    status: fromLineStatus[line.status],
    unitPriceRial: safeInteger(line.unitPriceRial),
    createdAt: line.createdAt,
  };
}

function mapNotice(notice: CartNotice): CartNoticeRecord {
  return {
    id: notice.id,
    lineId: notice.lineId,
    code: fromNoticeCode[notice.code],
    requestedQuantity: notice.requestedQuantity,
    appliedQuantity: notice.appliedQuantity,
  };
}

function mapCart(cart: CartWithRelations): CartRecord {
  return {
    id: cart.id,
    customerId: cart.customerId,
    version: cart.version,
    status: cart.status === CartStatus.ACTIVE ? 'active' : 'merged',
    lines: cart.lines.map(mapCartLine),
    notices: cart.notices.map(mapNotice),
  };
}

export class PrismaCartRepository implements CartRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async createAnonymousCart(): Promise<CartRecord> {
    const cart = await this.transactions.client().cart.create({
      data: {},
      include: cartInclude,
    });
    return mapCart(cart);
  }

  async getOrCreateCustomerCart(customerId: string): Promise<CartRecord> {
    const cart = await this.transactions.client().cart.upsert({
      where: { customerId },
      create: { customerId },
      update: {},
      include: cartInclude,
    });
    return mapCart(cart);
  }

  async getActiveCart(id: string): Promise<CartRecord> {
    const cart = await this.transactions.client().cart.findFirst({
      where: { id, status: CartStatus.ACTIVE },
      include: cartInclude,
    });
    if (cart === null) {
      throw new ApplicationError('not_found', 'CART_NOT_FOUND', 'Cart was not found.');
    }
    return mapCart(cart);
  }

  async getMergedCustomerCart(
    guestCartId: string,
    customerCartId: string,
  ): Promise<CartRecord | null> {
    const receipt = await this.transactions.client().cartMergeReceipt.findUnique({
      where: { guestCartId },
    });
    return receipt === null
      ? null
      : this.getActiveCart(
          receipt.customerCartId === customerCartId ? receipt.customerCartId : customerCartId,
        );
  }

  async addProduct(
    cartId: string,
    expectedVersion: number,
    product: CartCatalogProduct,
    quantity: number,
  ): Promise<CartRecord> {
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    await this.upsertProductLine(client, cartId, product, quantity);
    await this.incrementVersion(cartId, expectedVersion);
    return this.getActiveCart(cartId);
  }

  async addProducts(
    cartId: string,
    expectedVersion: number,
    selections: ReadonlyArray<{ product: CartCatalogProduct; quantity: number }>,
  ): Promise<CartRecord> {
    if (selections.length === 0) {
      throw new ApplicationError(
        'validation',
        'CART_PRODUCT_SELECTION_EMPTY',
        'A product selection must contain at least one product option.',
      );
    }
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    for (const selection of selections.toSorted((left, right) =>
      left.product.skuId.localeCompare(right.product.skuId),
    )) {
      await this.upsertProductLine(client, cartId, selection.product, selection.quantity);
    }
    await this.incrementVersion(cartId, expectedVersion);
    return this.getActiveCart(cartId);
  }

  private async upsertProductLine(
    client: DatabaseClient,
    cartId: string,
    product: CartCatalogProduct,
    quantity: number,
  ): Promise<void> {
    const existing = await client.cartLine.findFirst({
      where: { cartId, kind: CartLineKind.PRODUCT, skuId: product.skuId },
    });
    const requestedQuantity = (existing?.quantity ?? 0) + quantity;
    if (requestedQuantity > 20) {
      throw new ApplicationError(
        'validation',
        'CART_QUANTITY_LIMIT',
        'Cart line quantity cannot exceed 20.',
      );
    }
    const status =
      product.purchasable && product.availableQuantity >= requestedQuantity
        ? CartLineStatus.AVAILABLE
        : CartLineStatus.UNAVAILABLE;
    if (existing === null) {
      await client.cartLine.create({
        data: {
          cartId,
          kind: CartLineKind.PRODUCT,
          skuId: product.skuId,
          titleSnapshot: product.title,
          selectionSnapshot: product.selection,
          skuCodeSnapshot: product.skuCode,
          imageSnapshot:
            product.image === null
              ? Prisma.JsonNull
              : (product.image as unknown as Prisma.InputJsonValue),
          quantity,
          status,
          unitPriceRial: product.unitPriceRial,
        },
      });
    } else {
      await client.cartNotice.deleteMany({ where: { lineId: existing.id } });
      await client.cartLine.update({
        where: { id: existing.id },
        data: {
          quantity: requestedQuantity,
          status,
          unitPriceRial: product.unitPriceRial,
          titleSnapshot: product.title,
          selectionSnapshot: product.selection,
          skuCodeSnapshot: product.skuCode,
          imageSnapshot:
            product.image === null
              ? Prisma.JsonNull
              : (product.image as unknown as Prisma.InputJsonValue),
        },
      });
    }
  }

  async addOutfit(
    cartId: string,
    expectedVersion: number,
    outfit: OutfitCartSelection,
    quantity: number,
  ): Promise<CartRecord> {
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    const existing = await client.cartLine.findFirst({
      where: {
        cartId,
        kind: CartLineKind.OUTFIT,
        outfitRevisionId: outfit.revisionId,
        outfitSize: outfit.size,
      },
    });
    const requestedQuantity = (existing?.quantity ?? 0) + quantity;
    if (requestedQuantity > 20) {
      throw new ApplicationError(
        'validation',
        'CART_QUANTITY_LIMIT',
        'Cart line quantity cannot exceed 20.',
      );
    }
    const status = !outfit.purchasable
      ? CartLineStatus.REQUIRES_REVIEW
      : outfit.availableQuantity >= requestedQuantity
        ? CartLineStatus.AVAILABLE
        : CartLineStatus.UNAVAILABLE;
    const data = {
      outfitRevisionNumber: outfit.revisionNumber,
      titleSnapshot: outfit.title,
      selectionSnapshot: outfit.sizeLabel,
      imageSnapshot:
        outfit.image === null
          ? Prisma.JsonNull
          : (outfit.image as unknown as Prisma.InputJsonValue),
      quantity: requestedQuantity,
      status,
      unitPriceRial: outfit.unitPriceRial,
    };
    if (existing === null) {
      await client.cartLine.create({
        data: {
          cartId,
          kind: CartLineKind.OUTFIT,
          outfitRevisionId: outfit.revisionId,
          outfitSize: outfit.size,
          ...data,
        },
      });
    } else {
      await client.cartNotice.deleteMany({ where: { lineId: existing.id } });
      await client.cartLine.update({ where: { id: existing.id }, data });
    }
    await this.incrementVersion(cartId, expectedVersion);
    return this.getActiveCart(cartId);
  }

  async updateLine(
    cartId: string,
    lineId: string,
    expectedVersion: number,
    quantity: number,
    status: CartLineRecord['status'],
    unitPriceRial: number,
  ): Promise<CartRecord> {
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    const updated = await client.cartLine.updateMany({
      where: { id: lineId, cartId },
      data: { quantity, status: toLineStatus[status], unitPriceRial },
    });
    if (updated.count !== 1) {
      throw new ApplicationError('not_found', 'CART_LINE_NOT_FOUND', 'Cart line was not found.');
    }
    await client.cartNotice.deleteMany({ where: { cartId, lineId } });
    await this.incrementVersion(cartId, expectedVersion);
    return this.getActiveCart(cartId);
  }

  async removeLine(cartId: string, lineId: string, expectedVersion: number): Promise<void> {
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    const removed = await client.cartLine.deleteMany({ where: { id: lineId, cartId } });
    if (removed.count !== 1) {
      throw new ApplicationError('not_found', 'CART_LINE_NOT_FOUND', 'Cart line was not found.');
    }
    await this.incrementVersion(cartId, expectedVersion);
  }

  async clear(cartId: string, expectedVersion: number): Promise<void> {
    const client = this.transactions.client();
    await this.lockCart(cartId, expectedVersion);
    await client.cartLine.deleteMany({ where: { cartId } });
    await this.incrementVersion(cartId, expectedVersion);
  }

  async applyMerge(
    customerCartId: string,
    guestCartId: string,
    instructions: readonly MergeInstruction[],
  ): Promise<{ cart: CartRecord; mergePerformed: boolean }> {
    const client = this.transactions.client();
    const orderedIds = [customerCartId, guestCartId].sort();
    await client.$queryRaw(
      Prisma.sql`SELECT id FROM "carts" WHERE id = ANY(ARRAY[${Prisma.join(
        orderedIds,
      )}]::uuid[]) ORDER BY id FOR UPDATE`,
    );
    const replay = await client.cartMergeReceipt.findUnique({ where: { guestCartId } });
    if (replay !== null) {
      return {
        cart: await this.getActiveCart(
          replay.customerCartId === customerCartId ? replay.customerCartId : customerCartId,
        ),
        mergePerformed: false,
      };
    }
    const [customerCart, guestCart] = await Promise.all([
      client.cart.findFirst({ where: { id: customerCartId, status: CartStatus.ACTIVE } }),
      client.cart.findFirst({ where: { id: guestCartId, status: CartStatus.ACTIVE } }),
    ]);
    if (customerCart === null || customerCart.customerId === null) {
      throw new ApplicationError(
        'not_found',
        'CUSTOMER_CART_NOT_FOUND',
        'Customer cart was not found.',
      );
    }
    if (guestCart === null || guestCart.customerId !== null) {
      throw new ApplicationError('not_found', 'GUEST_CART_NOT_FOUND', 'Guest cart was not found.');
    }

    await client.cartNotice.deleteMany({ where: { cartId: guestCartId } });
    for (const instruction of instructions) {
      await this.applyMergeInstruction(customerCartId, instruction);
    }
    const now = new Date();
    await client.cart.update({
      where: { id: guestCartId },
      data: { status: CartStatus.MERGED, mergedAt: now, version: { increment: 1 } },
    });
    await client.cart.update({
      where: { id: customerCartId },
      data: { version: { increment: 1 } },
    });
    await client.cartMergeReceipt.create({ data: { guestCartId, customerCartId } });
    return { cart: await this.getActiveCart(customerCartId), mergePerformed: true };
  }

  private async applyMergeInstruction(
    customerCartId: string,
    instruction: MergeInstruction,
  ): Promise<void> {
    const client = this.transactions.client();
    let noticeLineId: string;
    if (instruction.kind === 'combine_product' || instruction.kind === 'combine_outfit') {
      await client.cartLine.update({
        where: { id: instruction.customerLineId },
        data: { quantity: instruction.quantity, status: toLineStatus[instruction.status] },
      });
      await client.cartLine.delete({ where: { id: instruction.guestLineId } });
      noticeLineId = instruction.customerLineId;
    } else {
      await client.cartLine.update({
        where: { id: instruction.guestLineId },
        data: {
          cartId: customerCartId,
          status: toLineStatus[instruction.status],
          quantity: instruction.quantity,
        },
      });
      noticeLineId = instruction.guestLineId;
    }
    if (instruction.notice !== null) {
      await client.cartNotice.create({
        data: {
          cartId: customerCartId,
          lineId: noticeLineId,
          code: toNoticeCode[instruction.notice],
          requestedQuantity: instruction.requestedQuantity,
          appliedQuantity: instruction.quantity,
        },
      });
    }
  }

  private async lockCart(cartId: string, expectedVersion: number): Promise<void> {
    const client = this.transactions.client();
    await client.$queryRaw(
      Prisma.sql`SELECT id FROM "carts" WHERE id = ${cartId}::uuid FOR UPDATE`,
    );
    const cart = await client.cart.findFirst({ where: { id: cartId, status: CartStatus.ACTIVE } });
    if (cart === null) {
      throw new ApplicationError('not_found', 'CART_NOT_FOUND', 'Cart was not found.');
    }
    if (cart.version !== expectedVersion) {
      throw new ApplicationError(
        'conflict',
        'CART_VERSION_CONFLICT',
        'Cart changed concurrently. Reload it and retry.',
      );
    }
  }

  private async incrementVersion(cartId: string, expectedVersion: number): Promise<void> {
    const result = await this.transactions.client().cart.updateMany({
      where: { id: cartId, status: CartStatus.ACTIVE, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ApplicationError(
        'conflict',
        'CART_VERSION_CONFLICT',
        'Cart changed concurrently. Reload it and retry.',
      );
    }
  }
}
