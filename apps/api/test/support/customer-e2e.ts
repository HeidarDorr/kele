import { PrismaClient } from '@prisma/client';
import { assertE2EDatabaseResetEnvironment } from '@kele/config/e2e-database';

function guardedClient(): PrismaClient {
  assertE2EDatabaseResetEnvironment(process.env);
  return new PrismaClient();
}

export async function ageE2EOtpChallenges(mobile: string): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.otpChallenge.updateMany({
      where: { mobile },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
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
    await prisma.cartLine.create({
      data: {
        cartId,
        kind: 'OUTFIT',
        outfitRevisionId: '30000000-0000-4000-8000-000000000018',
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
    await prisma.inventoryMovement.deleteMany({
      where: {
        OR: [{ reservationId: { in: reservationIds } }, { orderId: { in: orderIds } }],
      },
    });
    await prisma.businessEvent.deleteMany({
      where: { entityId: { in: [...checkoutIds, ...attemptIds, ...orderIds] } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.paymentAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    await prisma.inventoryReservation.deleteMany({
      where: { checkoutSessionId: { in: checkoutIds } },
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
      const now = new Date();
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
