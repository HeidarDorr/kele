import { InventoryAction, Prisma, PublicationStatus } from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  CheckoutCatalogProduct,
  CheckoutCatalogPort,
  CheckoutInventoryActor,
  CheckoutInventoryReservation,
} from '../application/checkout-catalog.contract.js';

function safeInteger(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Catalog money exceeds safe integer range.');
  return number;
}

export class PrismaCheckoutCatalogAdapter implements CheckoutCatalogPort {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  getProducts(skuIds: readonly string[]): Promise<ReadonlyMap<string, CheckoutCatalogProduct>> {
    return this.readProducts(skuIds);
  }

  async lockProducts(
    skuIds: readonly string[],
  ): Promise<ReadonlyMap<string, CheckoutCatalogProduct>> {
    const ordered = [...new Set(skuIds)].toSorted();
    if (ordered.length === 0) return new Map();
    const client = this.transactions.client();
    await client.$queryRaw(
      Prisma.sql`SELECT sku_id FROM "inventory" WHERE sku_id = ANY(ARRAY[${Prisma.join(
        ordered,
      )}]::uuid[]) ORDER BY sku_id FOR UPDATE`,
    );
    await client.$queryRaw(
      Prisma.sql`SELECT sku_id FROM "current_sku_prices" WHERE sku_id = ANY(ARRAY[${Prisma.join(
        ordered,
      )}]::uuid[]) ORDER BY sku_id FOR SHARE`,
    );
    return this.readProducts(ordered);
  }

  async reserve(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
  ): Promise<void> {
    for (const reservation of [...reservations].toSorted((a, b) =>
      a.skuId.localeCompare(b.skuId),
    )) {
      const current = await this.requireInventory(reservation.skuId);
      if (current.physicalQuantity - current.reservedQuantity < reservation.quantity) {
        throw new ApplicationError(
          'conflict',
          'INVENTORY_UNAVAILABLE',
          'Requested inventory is no longer available.',
        );
      }
      const afterReservedQuantity = current.reservedQuantity + reservation.quantity;
      const updated = await this.transactions.client().inventory.updateMany({
        where: { skuId: reservation.skuId, version: current.version },
        data: { reservedQuantity: afterReservedQuantity, version: { increment: 1 } },
      });
      if (updated.count !== 1) this.inventoryConflict();
      await this.recordMovement({
        reservation,
        actor,
        action: InventoryAction.RESERVATION,
        beforePhysicalQuantity: current.physicalQuantity,
        afterPhysicalQuantity: current.physicalQuantity,
        beforeReservedQuantity: current.reservedQuantity,
        afterReservedQuantity,
        quantityDelta: 0,
        reason: 'Checkout inventory reservation',
        idempotencyKey: `reservation:${reservation.reservationId}:hold`,
        orderId: null,
      });
      await this.recordEvent(
        actor,
        'InventoryReserved',
        reservation.skuId,
        reservation.checkoutSessionId,
        reservation.quantity,
      );
    }
  }

  async release(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
    reason: 'expired' | 'cancelled',
  ): Promise<void> {
    await this.lockInventory(reservations.map((reservation) => reservation.skuId));
    for (const reservation of [...reservations].toSorted((a, b) =>
      a.skuId.localeCompare(b.skuId),
    )) {
      const current = await this.requireInventory(reservation.skuId);
      if (current.reservedQuantity < reservation.quantity) this.inventoryConflict();
      const afterReservedQuantity = current.reservedQuantity - reservation.quantity;
      const updated = await this.transactions.client().inventory.updateMany({
        where: { skuId: reservation.skuId, version: current.version },
        data: { reservedQuantity: afterReservedQuantity, version: { increment: 1 } },
      });
      if (updated.count !== 1) this.inventoryConflict();
      await this.recordMovement({
        reservation,
        actor,
        action: InventoryAction.RESERVATION_RELEASE,
        beforePhysicalQuantity: current.physicalQuantity,
        afterPhysicalQuantity: current.physicalQuantity,
        beforeReservedQuantity: current.reservedQuantity,
        afterReservedQuantity,
        quantityDelta: 0,
        reason: reason === 'expired' ? 'Checkout reservation expired' : 'Checkout cancelled',
        idempotencyKey: `reservation:${reservation.reservationId}:release`,
        orderId: null,
      });
      await this.recordEvent(
        actor,
        'InventoryReservationReleased',
        reservation.skuId,
        reservation.checkoutSessionId,
        reservation.quantity,
      );
    }
  }

  async consume(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
    orderId: string,
  ): Promise<void> {
    await this.lockInventory(reservations.map((reservation) => reservation.skuId));
    for (const reservation of [...reservations].toSorted((a, b) =>
      a.skuId.localeCompare(b.skuId),
    )) {
      const current = await this.requireInventory(reservation.skuId);
      if (
        current.reservedQuantity < reservation.quantity ||
        current.physicalQuantity < reservation.quantity
      ) {
        this.inventoryConflict();
      }
      const afterPhysicalQuantity = current.physicalQuantity - reservation.quantity;
      const afterReservedQuantity = current.reservedQuantity - reservation.quantity;
      const updated = await this.transactions.client().inventory.updateMany({
        where: { skuId: reservation.skuId, version: current.version },
        data: {
          physicalQuantity: afterPhysicalQuantity,
          reservedQuantity: afterReservedQuantity,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) this.inventoryConflict();
      await this.recordMovement({
        reservation,
        actor,
        action: InventoryAction.SALE,
        beforePhysicalQuantity: current.physicalQuantity,
        afterPhysicalQuantity,
        beforeReservedQuantity: current.reservedQuantity,
        afterReservedQuantity,
        quantityDelta: -reservation.quantity,
        reason: 'Verified paid Order',
        idempotencyKey: `reservation:${reservation.reservationId}:consume`,
        orderId,
      });
      await this.recordEvent(
        actor,
        'InventorySold',
        reservation.skuId,
        reservation.checkoutSessionId,
        reservation.quantity,
      );
    }
  }

  private async lockInventory(skuIds: readonly string[]): Promise<void> {
    const ordered = [...new Set(skuIds)].toSorted();
    if (ordered.length === 0) return;
    await this.transactions
      .client()
      .$queryRaw(
        Prisma.sql`SELECT sku_id FROM "inventory" WHERE sku_id = ANY(ARRAY[${Prisma.join(
          ordered,
        )}]::uuid[]) ORDER BY sku_id FOR UPDATE`,
      );
  }

  private async readProducts(
    skuIds: readonly string[],
  ): Promise<ReadonlyMap<string, CheckoutCatalogProduct>> {
    const rows = await this.transactions.client().sku.findMany({
      where: { id: { in: [...new Set(skuIds)] } },
      include: {
        currentPrice: true,
        inventory: true,
        colorVariant: {
          include: {
            product: true,
            mediaAssignments: {
              where: { featured: true },
              orderBy: { displayOrder: 'asc' },
              take: 1,
              include: { mediaAsset: true },
            },
          },
        },
      },
    });
    return new Map(
      rows.map((sku) => {
        const media = sku.colorVariant.mediaAssignments[0]?.mediaAsset;
        const availableQuantity =
          (sku.inventory?.physicalQuantity ?? 0) - (sku.inventory?.reservedQuantity ?? 0);
        return [
          sku.id,
          {
            skuId: sku.id,
            title: sku.colorVariant.product.name,
            selection: `${sku.colorVariant.name} / ${sku.displaySize}`,
            skuCode: sku.code,
            image:
              media === undefined
                ? null
                : {
                    id: media.id,
                    url: media.url,
                    width: media.width,
                    height: media.height,
                    alt: media.altText,
                    focalPoint: { x: media.focalPointX, y: media.focalPointY },
                  },
            unitPriceRial: sku.currentPrice === null ? 0 : safeInteger(sku.currentPrice.amountRial),
            availableQuantity: Math.max(0, availableQuantity),
            purchasable:
              sku.status === PublicationStatus.PUBLISHED &&
              sku.colorVariant.status === PublicationStatus.PUBLISHED &&
              sku.colorVariant.product.status === PublicationStatus.PUBLISHED &&
              sku.currentPrice !== null &&
              sku.inventory !== null &&
              availableQuantity > 0,
          },
        ] as const;
      }),
    );
  }

  private async requireInventory(skuId: string) {
    const inventory = await this.transactions.client().inventory.findUnique({ where: { skuId } });
    if (inventory === null) {
      throw new ApplicationError('conflict', 'INVENTORY_UNAVAILABLE', 'Inventory was not found.');
    }
    return inventory;
  }

  private inventoryConflict(): never {
    throw new ApplicationError(
      'conflict',
      'INVENTORY_CONFLICT',
      'Inventory changed concurrently. Retry checkout.',
    );
  }

  private async recordMovement(input: {
    reservation: CheckoutInventoryReservation;
    actor: CheckoutInventoryActor;
    action: InventoryAction;
    quantityDelta: number;
    beforePhysicalQuantity: number;
    afterPhysicalQuantity: number;
    beforeReservedQuantity: number;
    afterReservedQuantity: number;
    reason: string;
    idempotencyKey: string;
    orderId: string | null;
  }): Promise<void> {
    await this.transactions.client().inventoryMovement.create({
      data: {
        skuId: input.reservation.skuId,
        action: input.action,
        quantityDelta: input.quantityDelta,
        beforePhysicalQuantity: input.beforePhysicalQuantity,
        afterPhysicalQuantity: input.afterPhysicalQuantity,
        beforeReservedQuantity: input.beforeReservedQuantity,
        afterReservedQuantity: input.afterReservedQuantity,
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: input.idempotencyKey,
        reservationId: input.reservation.reservationId,
        orderId: input.orderId,
      },
    });
  }

  private async recordEvent(
    actor: CheckoutInventoryActor,
    type: string,
    skuId: string,
    checkoutSessionId: string,
    quantity: number,
  ): Promise<void> {
    await this.transactions.client().businessEvent.create({
      data: {
        type,
        actorId: actor.actorId,
        entityType: 'SKU',
        entityId: skuId,
        correlationId: actor.correlationId,
        payload: { checkoutSessionId, quantity },
      },
    });
  }
}
