import { CartLineKind, CartLineStatus, CartStatus, Prisma, type CartLine } from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CartCatalogMedia } from '../../catalog/application/cart-catalog.contract.js';
import type {
  CheckoutCart,
  CheckoutCartLine,
  CheckoutCartPort,
} from '../application/checkout-cart.contract.js';

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

function mapLine(line: CartLine): CheckoutCartLine {
  return {
    id: line.id,
    kind: line.kind === CartLineKind.PRODUCT ? 'product' : 'outfit',
    skuId: line.skuId,
    outfitRevisionId: line.outfitRevisionId,
    outfitSize: line.outfitSize,
    titleSnapshot: line.titleSnapshot,
    selectionSnapshot: line.selectionSnapshot,
    skuCodeSnapshot: line.skuCodeSnapshot,
    imageSnapshot: isMedia(line.imageSnapshot) ? line.imageSnapshot : null,
    quantity: line.quantity,
    status:
      line.status === CartLineStatus.AVAILABLE
        ? 'available'
        : line.status === CartLineStatus.UNAVAILABLE
          ? 'unavailable'
          : 'requires_review',
  };
}

export class PrismaCheckoutCartAdapter implements CheckoutCartPort {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  getOwnedCart(customerId: string, cartId: string): Promise<CheckoutCart> {
    return this.readOwnedCart(customerId, cartId);
  }

  async lockOwnedCart(customerId: string, cartId: string): Promise<CheckoutCart> {
    await this.transactions
      .client()
      .$queryRaw(
        Prisma.sql`SELECT id FROM "carts" WHERE id = ${cartId}::uuid AND customer_id = ${customerId}::uuid AND status = 'ACTIVE' FOR UPDATE`,
      );
    return this.readOwnedCart(customerId, cartId);
  }

  async completePurchasedLines(
    customerId: string,
    cartId: string,
    purchases: readonly Readonly<{ cartLineId: string; quantity: number }>[],
  ): Promise<void> {
    const client = this.transactions.client();
    await this.lockOwnedCart(customerId, cartId);
    for (const purchase of purchases) {
      const line = await client.cartLine.findFirst({
        where: { id: purchase.cartLineId, cartId },
      });
      if (line === null) continue;
      await client.cartNotice.deleteMany({ where: { lineId: line.id } });
      if (line.quantity <= purchase.quantity) {
        await client.cartLine.delete({ where: { id: line.id } });
      } else {
        await client.cartLine.update({
          where: { id: line.id },
          data: { quantity: line.quantity - purchase.quantity },
        });
      }
    }
    await client.cart.update({ where: { id: cartId }, data: { version: { increment: 1 } } });
  }

  private async readOwnedCart(customerId: string, cartId: string): Promise<CheckoutCart> {
    const cart = await this.transactions.client().cart.findFirst({
      where: { id: cartId, customerId, status: CartStatus.ACTIVE },
      include: { lines: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    });
    if (cart === null) {
      throw new ApplicationError('not_found', 'CART_NOT_FOUND', 'Cart was not found.');
    }
    return {
      id: cart.id,
      customerId,
      version: cart.version,
      lines: cart.lines.map(mapLine),
    };
  }
}
