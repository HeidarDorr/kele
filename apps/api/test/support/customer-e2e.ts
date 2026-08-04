import { PrismaClient } from '@prisma/client';
import { assertE2EDatabaseResetEnvironment } from '@kele/config/e2e-database';

function guardedClient(): PrismaClient {
  assertE2EDatabaseResetEnvironment(process.env);
  return new PrismaClient();
}

function deterministicE2ENow(): Date {
  const fixedTime = process.env.E2E_FIXED_TIME;
  if (fixedTime === undefined) throw new Error('E2E_FIXED_TIME is required for browser fixtures.');
  return new Date(fixedTime);
}

export async function ageE2EOtpChallenges(mobile: string): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.otpChallenge.updateMany({
      where: { mobile },
      data: { createdAt: new Date(deterministicE2ENow().getTime() - 2 * 60_000) },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function setE2EInventory(skuId: string, physicalQuantity: number): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.inventory.update({
      where: { skuId },
      data: { physicalQuantity, reservedQuantity: 0, version: { increment: 1 } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function addE2EOutfitReviewLine(cartId: string): Promise<void> {
  const prisma = guardedClient();
  try {
    const outfitId = '30000000-0000-4000-8000-000000000017';
    const revisionId = '30000000-0000-4000-8000-000000000018';
    const existing = await prisma.outfitRevision.findUnique({ where: { id: revisionId } });
    if (existing === null) {
      await prisma.outfit.create({
        data: { id: outfitId, slug: 'historical-e2e-review-outfit', status: 'ARCHIVED' },
      });
      const now = deterministicE2ENow();
      await prisma.outfitRevision.create({
        data: {
          id: revisionId,
          outfitId,
          revisionNumber: 1,
          state: 'HISTORICAL',
          name: 'استایل تاریخی آزمون',
          description: 'Fixture قطعی برای بررسی سبد قدیمی',
          publishedAt: now,
          supersededAt: now,
        },
      });
    }
    await prisma.cartLine.create({
      data: {
        cartId,
        kind: 'OUTFIT',
        outfitRevisionId: revisionId,
        outfitRevisionNumber: 1,
        outfitSize: 'M',
        titleSnapshot: 'استایل تاریخی آزمون',
        selectionSnapshot: 'M',
        quantity: 1,
        status: 'REQUIRES_REVIEW',
        unitPriceRial: 65_000_000,
      },
    });
    await prisma.cart.update({ where: { id: cartId }, data: { version: { increment: 1 } } });
  } finally {
    await prisma.$disconnect();
  }
}

export type E2EOperationsOrderFixture = Readonly<{
  skuId: string;
  orderNumber: string;
  ids: Readonly<{
    customer: string;
    checkoutSession: string;
    paymentAttempt: string;
    order: string;
    orderItem: string;
    createdTimelineEvent: string;
    saleInventoryMovement: string;
    createdCorrelation: string;
    saleCorrelation: string;
  }>;
  idempotencyKeys: Readonly<{
    checkout: string;
    payment: string;
    createdTimeline: string;
    saleInventory: string;
  }>;
  providerReference: string;
  providerTransactionId: string;
  createdReason: string;
  saleReason: string;
  recipient: Readonly<{
    name: string;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
  }>;
  shipping: Readonly<{
    methodCode: 'IRAN_POST' | 'TIPAX' | 'TEHRAN_LOCAL_COURIER';
    methodName: string;
    fixedPriceRial: number;
  }>;
}>;

export async function prepareE2EOperationsCustomer(
  mobile: string,
  customerId: string,
): Promise<void> {
  const prisma = guardedClient();
  try {
    const now = deterministicE2ENow();
    const customer = await prisma.customer.upsert({
      where: { mobile },
      create: { id: customerId, mobile, createdAt: now, updatedAt: now },
      update: {},
    });
    if (customer.id !== customerId) {
      throw new Error('M6 E2E customer does not match the deterministic fixture ID.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function createE2EOperationsOrder(
  mobile: string,
  fixture: E2EOperationsOrderFixture,
): Promise<{
  orderNumber: string;
  orderItemId: string;
}> {
  const prisma = guardedClient();
  try {
    const now = deterministicE2ENow();
    const customer = await prisma.customer.findUniqueOrThrow({ where: { mobile } });
    if (customer.id !== fixture.ids.customer) {
      throw new Error('M6 E2E Order customer does not match the deterministic fixture ID.');
    }
    const cart = await prisma.cart.findUniqueOrThrow({ where: { customerId: customer.id } });
    const sku = await prisma.sku.findUniqueOrThrow({
      where: { id: fixture.skuId },
      include: {
        colorVariant: { include: { product: true } },
        inventory: true,
        currentPrice: true,
      },
    });
    if (sku.inventory === null || sku.currentPrice === null || sku.inventory.physicalQuantity < 1) {
      throw new Error('M6 E2E fixture requires a priced SKU with physical inventory.');
    }
    const currentPrice = sku.currentPrice;
    const startingInventory = sku.inventory;
    const policy = await prisma.shippingPolicyVersion.findFirstOrThrow({
      where: { effectiveAt: { lte: now } },
      orderBy: { version: 'desc' },
    });
    const addressSnapshot = {
      recipientName: fixture.recipient.name,
      recipientMobile: mobile,
      province: fixture.recipient.province,
      city: fixture.recipient.city,
      addressLine: fixture.recipient.addressLine,
      postalCode: fixture.recipient.postalCode,
      normalizedZone: 'tehran',
    };
    const result = await prisma.$transaction(async (transaction) => {
      const checkout = await transaction.checkoutSession.create({
        data: {
          id: fixture.ids.checkoutSession,
          customerId: customer.id,
          cartId: cart.id,
          cartVersion: cart.version,
          status: 'PAID',
          idempotencyKey: fixture.idempotencyKeys.checkout,
          requestHash: '6'.repeat(64),
          itemsSubtotalRial: currentPrice.amountRial,
          shippingTotalRial: fixture.shipping.fixedPriceRial,
          payableTotalRial: currentPrice.amountRial + BigInt(fixture.shipping.fixedPriceRial),
          addressSnapshot,
          shippingMethodCode: fixture.shipping.methodCode,
          shippingMethodName: fixture.shipping.methodName,
          shippingFixedPriceRial: fixture.shipping.fixedPriceRial,
          freeShippingApplied: false,
          shippingSettingsVersion: policy.version,
          expiresAt: new Date(now.getTime() + 30 * 60_000),
          paidAt: now,
          createdAt: now,
        },
      });
      const attempt = await transaction.paymentAttempt.create({
        data: {
          id: fixture.ids.paymentAttempt,
          checkoutSessionId: checkout.id,
          provider: 'fake',
          providerReference: fixture.providerReference,
          providerTransactionId: fixture.providerTransactionId,
          status: 'VERIFIED',
          amountRial: currentPrice.amountRial + BigInt(fixture.shipping.fixedPriceRial),
          idempotencyKey: fixture.idempotencyKeys.payment,
          requestHash: '7'.repeat(64),
          verifiedAt: now,
          createdAt: now,
        },
      });
      const order = await transaction.order.create({
        data: {
          id: fixture.ids.order,
          orderNumber: fixture.orderNumber,
          customerId: customer.id,
          checkoutSessionId: checkout.id,
          paymentAttemptId: attempt.id,
          itemsSubtotalRial: currentPrice.amountRial,
          shippingTotalRial: fixture.shipping.fixedPriceRial,
          paidTotalRial: currentPrice.amountRial + BigInt(fixture.shipping.fixedPriceRial),
          addressSnapshot,
          shippingMethodCode: fixture.shipping.methodCode,
          shippingMethodName: fixture.shipping.methodName,
          shippingFixedPriceRial: fixture.shipping.fixedPriceRial,
          freeShippingApplied: false,
          shippingSettingsVersion: policy.version,
          paymentProvider: 'fake',
          providerTransactionId: attempt.providerTransactionId ?? fixture.providerTransactionId,
          paidAt: now,
          createdAt: now,
          items: {
            create: {
              id: fixture.ids.orderItem,
              kind: 'PRODUCT',
              skuId: sku.id,
              titleSnapshot: sku.colorVariant.product.name,
              selectionSnapshot: `${sku.colorVariant.name} / ${sku.displaySize}`,
              skuCodeSnapshot: sku.code,
              quantity: 1,
              unitPriceRial: currentPrice.amountRial,
              lineTotalRial: currentPrice.amountRial,
              createdAt: now,
            },
          },
          timeline: {
            create: {
              id: fixture.ids.createdTimelineEvent,
              type: 'created',
              toStatus: 'PAID',
              actorId: 'payment:fake',
              reason: fixture.createdReason,
              correlationId: fixture.ids.createdCorrelation,
              idempotencyKey: fixture.idempotencyKeys.createdTimeline,
              createdAt: now,
            },
          },
        },
        include: { items: true },
      });
      await transaction.inventory.update({
        where: { skuId: sku.id },
        data: { physicalQuantity: { decrement: 1 }, version: { increment: 1 } },
      });
      await transaction.inventoryMovement.create({
        data: {
          id: fixture.ids.saleInventoryMovement,
          skuId: sku.id,
          action: 'SALE',
          quantityDelta: -1,
          beforePhysicalQuantity: startingInventory.physicalQuantity,
          afterPhysicalQuantity: startingInventory.physicalQuantity - 1,
          beforeReservedQuantity: startingInventory.reservedQuantity,
          afterReservedQuantity: startingInventory.reservedQuantity,
          actorId: 'payment:fake',
          reason: fixture.saleReason,
          correlationId: fixture.ids.saleCorrelation,
          idempotencyKey: fixture.idempotencyKeys.saleInventory,
          orderId: order.id,
          createdAt: now,
        },
      });
      return order;
    });
    const orderItem = result.items[0];
    if (orderItem === undefined) throw new Error('Expected M6 E2E Order item.');
    return { orderNumber: result.orderNumber, orderItemId: orderItem.id };
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupE2ECustomer(mobile: string, cartIds: string[]): Promise<void> {
  const prisma = guardedClient();
  try {
    const customer = await prisma.customer.findUnique({ where: { mobile } });
    const customerCarts =
      customer === null ? [] : await prisma.cart.findMany({ where: { customerId: customer.id } });
    const ids = [...new Set([...cartIds, ...customerCarts.map((cart) => cart.id)])];
    const checkouts = await prisma.checkoutSession.findMany({
      where: { cartId: { in: ids } },
      select: { id: true },
    });
    const checkoutIds = checkouts.map((checkout) => checkout.id);
    const attempts = await prisma.paymentAttempt.findMany({
      where: { checkoutSessionId: { in: checkoutIds } },
      select: { id: true },
    });
    const attemptIds = attempts.map((attempt) => attempt.id);
    const orders = await prisma.order.findMany({
      where: { checkoutSessionId: { in: checkoutIds } },
      select: { id: true },
    });
    const orderIds = orders.map((order) => order.id);
    const returns = await prisma.returnRequest.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true },
    });
    const returnIds = returns.map((request) => request.id);
    const refunds = await prisma.refund.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true },
    });
    const refundIds = refunds.map((refund) => refund.id);
    const reservations = await prisma.inventoryReservation.findMany({
      where: { checkoutSessionId: { in: checkoutIds } },
      select: { id: true },
    });
    const reservationIds = reservations.map((reservation) => reservation.id);
    await prisma.paymentCallbackReceipt.deleteMany({
      where: { paymentAttemptId: { in: attemptIds } },
    });
    await prisma.paymentReconciliation.deleteMany({
      where: { checkoutSessionId: { in: checkoutIds } },
    });
    await prisma.databaseJob.deleteMany({
      where: {
        OR: [
          ...checkoutIds.map((id) => ({ idempotencyKey: `expire-checkout:${id}` })),
          ...attemptIds.flatMap((id) => [
            { idempotencyKey: `recover-payment:${id}` },
            { idempotencyKey: `reconcile:fake:fake-txn-${id}` },
          ]),
        ],
      },
    });
    await prisma.refundAttempt.deleteMany({ where: { refundId: { in: refundIds } } });
    await prisma.refund.deleteMany({ where: { id: { in: refundIds } } });
    await prisma.returnItem.deleteMany({ where: { returnRequestId: { in: returnIds } } });
    await prisma.inventoryMovement.deleteMany({
      where: {
        OR: [
          { reservationId: { in: reservationIds } },
          { orderId: { in: orderIds } },
          { returnRequestId: { in: returnIds } },
        ],
      },
    });
    await prisma.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
    await prisma.businessEvent.deleteMany({
      where: { entityId: { in: [...checkoutIds, ...attemptIds, ...orderIds] } },
    });
    await prisma.orderOutfitComponent.deleteMany({
      where: { orderItem: { orderId: { in: orderIds } } },
    });
    await prisma.orderTimelineEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.shipmentTrackingRevision.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.paymentAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    await prisma.inventoryReservation.deleteMany({
      where: { checkoutSessionId: { in: checkoutIds } },
    });
    await prisma.checkoutOutfitComponent.deleteMany({
      where: { checkoutLine: { checkoutSessionId: { in: checkoutIds } } },
    });
    await prisma.checkoutLine.deleteMany({ where: { checkoutSessionId: { in: checkoutIds } } });
    await prisma.checkoutSession.deleteMany({ where: { id: { in: checkoutIds } } });
    await prisma.cartMergeReceipt.deleteMany({
      where: { OR: [{ guestCartId: { in: ids } }, { customerCartId: { in: ids } }] },
    });
    await prisma.cartNotice.deleteMany({ where: { cartId: { in: ids } } });
    await prisma.cartLine.deleteMany({ where: { cartId: { in: ids } } });
    await prisma.cart.deleteMany({ where: { id: { in: ids } } });
    if (customer !== null) {
      await prisma.address.deleteMany({ where: { customerId: customer.id } });
      await prisma.customerSession.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
    await prisma.otpChallenge.deleteMany({ where: { mobile } });
  } finally {
    await prisma.$disconnect();
  }
}

export async function readE2EPaymentEvidence(mobile: string, skuId: string) {
  const prisma = guardedClient();
  try {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { mobile } });
    const [orders, reconciliations, callbacks, inventory] = await Promise.all([
      prisma.order.count({ where: { customerId: customer.id } }),
      prisma.paymentReconciliation.count({
        where: { checkoutSession: { customerId: customer.id } },
      }),
      prisma.paymentCallbackReceipt.count({
        where: { paymentAttempt: { checkoutSession: { customerId: customer.id } } },
      }),
      prisma.inventory.findUniqueOrThrow({ where: { skuId } }),
    ]);
    return {
      orders,
      reconciliations,
      callbacks,
      physicalQuantity: inventory.physicalQuantity,
      reservedQuantity: inventory.reservedQuantity,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function expireE2EPayment(paymentAttemptId: string): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.paymentAttempt.findUniqueOrThrow({
        where: { id: paymentAttemptId },
      });
      const reservations = await transaction.inventoryReservation.findMany({
        where: { checkoutSessionId: attempt.checkoutSessionId, status: 'ACTIVE' },
      });
      for (const reservation of reservations) {
        await transaction.inventory.update({
          where: { skuId: reservation.skuId },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
            version: { increment: 1 },
          },
        });
      }
      const now = new Date(deterministicE2ENow().getTime() + 31 * 60_000);
      await transaction.inventoryReservation.updateMany({
        where: { checkoutSessionId: attempt.checkoutSessionId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', releasedAt: now },
      });
      await transaction.checkoutSession.update({
        where: { id: attempt.checkoutSessionId },
        data: { status: 'EXPIRED', expiredAt: now },
      });
      await transaction.databaseJob.updateMany({
        where: { idempotencyKey: `expire-checkout:${attempt.checkoutSessionId}` },
        data: { status: 'COMPLETED', completedAt: now },
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}
