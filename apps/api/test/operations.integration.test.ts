import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, type OrderFulfillmentStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import { OperationsService } from '../src/modules/operations/application/operations.service.js';
import { PrismaOperationsRepository } from '../src/modules/operations/infrastructure/prisma-operations.repository.js';
import { FakeRefundAdapter } from '../src/modules/foundation/infrastructure/fake-refund.adapter.js';
import type { RefundGateway } from '../src/modules/foundation/application/refund-gateway.port.js';
import { PrismaCatalogRepository } from '../src/modules/catalog/infrastructure/prisma-catalog.repository.js';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const transactions = new PrismaTransactionContext(prismaService);
const repository = new PrismaOperationsRepository(transactions);
let now = new Date('2026-08-04T09:00:00.000Z');
const actor = {
  actorId: 'admin-inventory',
  role: 'inventory_admin' as const,
  correlationId: randomUUID(),
};
const superActor = {
  actorId: 'admin-super',
  role: 'super_admin' as const,
  correlationId: randomUUID(),
};
const service = new OperationsService(
  repository,
  new FakeRefundAdapter(),
  transactions,
  () => new Date(now),
);

const customerIds = new Set<string>();
const cartIds = new Set<string>();
const checkoutIds = new Set<string>();
const attemptIds = new Set<string>();
const orderIds = new Set<string>();
const productIds = new Set<string>();
const variantIds = new Set<string>();
const skuIds = new Set<string>();
let policyId = '';
let policyVersion = 0;
let mobileCounter = 100_000_000;

async function createFixture(
  input: {
    status?: OrderFulfillmentStatus;
    deliveredAt?: Date | null;
    physicalQuantity?: number;
    itemQuantity?: number;
  } = {},
) {
  const token = randomUUID().replaceAll('-', '');
  const itemQuantity = input.itemQuantity ?? 1;
  const itemsSubtotalRial = 12_000_000 * itemQuantity;
  const payableTotalRial = itemsSubtotalRial + 800_000;
  const customer = await prisma.customer.create({
    data: { mobile: `+989${String(mobileCounter++)}` },
  });
  customerIds.add(customer.id);
  const cart = await prisma.cart.create({ data: { customerId: customer.id } });
  cartIds.add(cart.id);
  const product = await prisma.product.create({
    data: {
      name: `M6 ${token}`,
      slug: `m6-${token}`,
      description: 'Milestone 6 integration fixture',
      status: 'PUBLISHED',
      searchText: token,
    },
  });
  productIds.add(product.id);
  const variant = await prisma.colorVariant.create({
    data: {
      productId: product.id,
      name: 'مشکی',
      normalizedColorCode: `black-${token.slice(0, 8)}`,
      status: 'PUBLISHED',
    },
  });
  variantIds.add(variant.id);
  const sku = await prisma.sku.create({
    data: {
      colorVariantId: variant.id,
      code: `M6-${token.slice(0, 12).toUpperCase()}`,
      normalizedSize: 'm',
      displaySize: 'M',
      status: 'PUBLISHED',
      inventory: { create: { physicalQuantity: input.physicalQuantity ?? 4 } },
      priceRecords: {
        create: { amountRial: 12_000_000, actorId: 'm6-fixture', reason: 'M6 fixture price' },
      },
    },
    include: { priceRecords: true },
  });
  skuIds.add(sku.id);
  const priceRecord = sku.priceRecords[0];
  if (priceRecord === undefined) throw new Error('Expected fixture price record.');
  await prisma.currentSkuPrice.create({
    data: { skuId: sku.id, priceRecordId: priceRecord.id, amountRial: 12_000_000 },
  });
  const checkout = await prisma.checkoutSession.create({
    data: {
      customerId: customer.id,
      cartId: cart.id,
      cartVersion: 0,
      status: 'PAID',
      idempotencyKey: `checkout-${token}`,
      requestHash: 'a'.repeat(64),
      itemsSubtotalRial,
      shippingTotalRial: 800_000,
      payableTotalRial,
      addressSnapshot: {
        recipientName: 'مشتری آزمون',
        recipientMobile: customer.mobile,
        province: 'تهران',
        city: 'تهران',
        addressLine: 'خیابان آزمون، پلاک ۶',
        postalCode: '1234567890',
        normalizedZone: 'tehran',
      },
      shippingMethodCode: 'IRAN_POST',
      shippingMethodName: 'پست ایران',
      shippingFixedPriceRial: 800_000,
      freeShippingApplied: false,
      shippingSettingsVersion: policyVersion,
      expiresAt: new Date(now.getTime() + 30 * 60_000),
      paidAt: now,
      createdAt: now,
    },
  });
  checkoutIds.add(checkout.id);
  const attempt = await prisma.paymentAttempt.create({
    data: {
      checkoutSessionId: checkout.id,
      provider: 'fake',
      providerReference: `m6-provider-${token}`,
      providerTransactionId: `m6-txn-${token}`,
      status: 'VERIFIED',
      amountRial: payableTotalRial,
      idempotencyKey: `attempt-${token}`,
      requestHash: 'b'.repeat(64),
      verifiedAt: now,
    },
  });
  attemptIds.add(attempt.id);
  const order = await prisma.order.create({
    data: {
      orderNumber: `M6-${token.slice(0, 14).toUpperCase()}`,
      customerId: customer.id,
      checkoutSessionId: checkout.id,
      paymentAttemptId: attempt.id,
      fulfillmentStatus: input.status ?? 'PAID',
      itemsSubtotalRial,
      shippingTotalRial: 800_000,
      paidTotalRial: payableTotalRial,
      addressSnapshot: {
        recipientName: 'مشتری آزمون',
        recipientMobile: customer.mobile,
        province: 'تهران',
        city: 'تهران',
        addressLine: 'خیابان آزمون، پلاک ۶',
        postalCode: '1234567890',
        normalizedZone: 'tehran',
      },
      shippingMethodCode: 'IRAN_POST',
      shippingMethodName: 'پست ایران',
      shippingFixedPriceRial: 800_000,
      freeShippingApplied: false,
      shippingSettingsVersion: policyVersion,
      paymentProvider: 'fake',
      providerTransactionId: attempt.providerTransactionId ?? `m6-txn-${token}`,
      paidAt: now,
      deliveredAt: input.deliveredAt ?? null,
      items: {
        create: {
          kind: 'PRODUCT',
          skuId: sku.id,
          titleSnapshot: product.name,
          selectionSnapshot: 'مشکی / M',
          skuCodeSnapshot: sku.code,
          quantity: itemQuantity,
          unitPriceRial: 12_000_000,
          lineTotalRial: itemsSubtotalRial,
        },
      },
      timeline: {
        create: {
          type: 'created',
          toStatus: 'PAID',
          actorId: 'payment:fake',
          reason: 'Fixture paid Order',
          correlationId: randomUUID(),
          idempotencyKey: `created-${token}`,
          createdAt: now,
        },
      },
    },
    include: { items: true },
  });
  orderIds.add(order.id);
  const orderItem = order.items[0];
  if (orderItem === undefined) throw new Error('Expected fixture order item.');
  return { customer, sku, order, orderItem };
}

beforeAll(async () => {
  const latest = await prisma.shippingPolicyVersion.aggregate({ _max: { version: true } });
  policyVersion = (latest._max.version ?? 0) + 1;
  const policy = await prisma.shippingPolicyVersion.create({
    data: {
      version: policyVersion,
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      actorId: 'm6-integration',
      reason: 'M6 integration fixture',
      methods: {
        create: {
          code: 'IRAN_POST',
          localizedName: 'پست ایران',
          fixedPriceRial: 800_000,
          enabled: true,
          displayOrder: 0,
        },
      },
    },
  });
  policyId = policy.id;
});

afterAll(async () => {
  const orders = [...orderIds];
  const returns = await prisma.returnRequest.findMany({
    where: { orderId: { in: orders } },
    select: { id: true },
  });
  const returnIds = returns.map((item) => item.id);
  const refunds = await prisma.refund.findMany({
    where: { orderId: { in: orders } },
    select: { id: true },
  });
  const refundIds = refunds.map((item) => item.id);
  const orderTargets = await prisma.order.findMany({
    where: { id: { in: orders } },
    select: { orderNumber: true, customerId: true },
  });
  const bulkTargets = await prisma.bulkOperation.findMany({
    where: { actorId: { in: [actor.actorId, superActor.actorId] } },
    select: { id: true },
  });
  await prisma.commandReceipt.deleteMany({
    where: {
      entityId: {
        in: [
          ...orderTargets.flatMap((order) => [
            order.orderNumber,
            `${order.customerId}:${order.orderNumber}`,
          ]),
          ...returnIds,
          ...refundIds,
          ...bulkTargets.map((operation) => operation.id),
          ...skuIds,
        ],
      },
    },
  });
  await prisma.refundAttempt.deleteMany({ where: { refundId: { in: refundIds } } });
  await prisma.inventoryMovement.deleteMany({
    where: { OR: [{ orderId: { in: orders } }, { skuId: { in: [...skuIds] } }] },
  });
  await prisma.refund.deleteMany({ where: { id: { in: refundIds } } });
  await prisma.returnItem.deleteMany({ where: { returnRequestId: { in: returnIds } } });
  await prisma.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
  await prisma.orderTimelineEvent.deleteMany({ where: { orderId: { in: orders } } });
  await prisma.shipmentTrackingRevision.deleteMany({ where: { orderId: { in: orders } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orders } } });
  await prisma.order.deleteMany({ where: { id: { in: orders } } });
  await prisma.paymentAttempt.deleteMany({ where: { id: { in: [...attemptIds] } } });
  await prisma.checkoutSession.deleteMany({ where: { id: { in: [...checkoutIds] } } });
  await prisma.cart.deleteMany({ where: { id: { in: [...cartIds] } } });
  await prisma.customer.deleteMany({ where: { id: { in: [...customerIds] } } });
  await prisma.bulkOperationItem.deleteMany({ where: { skuId: { in: [...skuIds] } } });
  await prisma.bulkOperation.deleteMany({
    where: { actorId: { in: [actor.actorId, superActor.actorId] } },
  });
  await prisma.currentSkuPrice.deleteMany({ where: { skuId: { in: [...skuIds] } } });
  await prisma.priceRecord.deleteMany({ where: { skuId: { in: [...skuIds] } } });
  await prisma.inventory.deleteMany({ where: { skuId: { in: [...skuIds] } } });
  await prisma.sku.deleteMany({ where: { id: { in: [...skuIds] } } });
  await prisma.colorVariant.deleteMany({ where: { id: { in: [...variantIds] } } });
  await prisma.product.deleteMany({ where: { id: { in: [...productIds] } } });
  await prisma.shippingMethodVersion.deleteMany({ where: { policyId } });
  await prisma.shippingPolicyVersion.delete({ where: { id: policyId } });
  await prisma.businessEvent.deleteMany({
    where: { actorId: { in: [actor.actorId, superActor.actorId, 'm6-integration'] } },
  });
  await prisma.$disconnect();
});

describe('Milestone 6 operations, fulfillment and returns on PostgreSQL', () => {
  it('[ORD-009][ORD-010][ORD-013][ORD-017] applies and replays the complete allowed fulfillment path', async () => {
    const fixture = await createFixture();
    const prepareKey = `prepare-${randomUUID()}`;
    const preparing = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'preparing',
      reason: 'آماده‌سازی سفارش',
      tracking: null,
      idempotencyKey: prepareKey,
      actor,
    });
    const replay = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'preparing',
      reason: 'آماده‌سازی سفارش',
      tracking: null,
      idempotencyKey: prepareKey,
      actor,
    });
    expect(replay.version).toBe(preparing.version);
    const shipped = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: preparing.version,
      toStatus: 'shipped',
      reason: 'تحویل به پست',
      tracking: {
        carrier: 'پست ایران',
        trackingNumber: 'IR-POST-12345',
        trackingUrl: 'https://example.test/track/12345',
      },
      idempotencyKey: `ship-${randomUUID()}`,
      actor,
    });
    const delivered = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: shipped.version,
      toStatus: 'delivered',
      reason: 'تحویل تأیید شد',
      tracking: null,
      idempotencyKey: `deliver-${randomUUID()}`,
      actor,
    });
    expect(delivered).toMatchObject({
      fulfillmentStatus: 'delivered',
      tracking: { trackingNumber: 'IR-POST-12345' },
    });
    const auditMatches = await service.listAuditEvents(
      {
        from: null,
        to: null,
        eventType: null,
        actor: null,
        entityType: null,
        entityId: null,
        search: fixture.order.orderNumber,
        limit: 20,
      },
      actor,
    );
    expect(auditMatches.length).toBeGreaterThan(0);
    await expect(
      service.transitionOrder({
        orderNumber: fixture.order.orderNumber,
        expectedVersion: delivered.version,
        toStatus: 'preparing',
        reason: 'حرکت غیرمجاز',
        tracking: null,
        idempotencyKey: `illegal-${randomUUID()}`,
        actor,
      }),
    ).rejects.toMatchObject({ code: 'ORDER_TRANSITION_ILLEGAL' });
  });

  it('[ORD-005][ORD-006][PAY-002] cancels once only after provider confirmation and restores the ledger once', async () => {
    const fixture = await createFixture();
    const key = `cancel-${randomUUID()}`;
    const cancelled = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'cancelled',
      reason: 'لغو توسط عملیات',
      tracking: null,
      idempotencyKey: key,
      actor,
    });
    expect(cancelled.fulfillmentStatus).toBe('cancelled');
    expect(
      (await prisma.inventory.findUniqueOrThrow({ where: { skuId: fixture.sku.id } }))
        .physicalQuantity,
    ).toBe(5);
    const replay = await service.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'cancelled',
      reason: 'لغو توسط عملیات',
      tracking: null,
      idempotencyKey: key,
      actor,
    });
    expect(replay.fulfillmentStatus).toBe('cancelled');
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: fixture.order.id, action: 'ORDER_CANCELLATION' },
      }),
    ).toBe(1);
  });

  it('[ORD-005][ORD-010][PAY-002] blocks fulfillment while cancellation confirmation is in flight', async () => {
    const fixture = await createFixture();
    let releaseProvider!: () => void;
    let markProviderEntered!: () => void;
    const providerEntered = new Promise<void>((resolve) => {
      markProviderEntered = resolve;
    });
    const providerRelease = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const blockingGateway: RefundGateway = {
      requestRefund: async () => {
        markProviderEntered();
        await providerRelease;
        return {
          provider: 'fake',
          providerReference: 'confirmed-after-race',
          status: 'confirmed',
          confirmedAt: new Date(now),
          failureCode: null,
        };
      },
    };
    const cancellationService = new OperationsService(
      repository,
      blockingGateway,
      transactions,
      () => new Date(now),
    );
    const cancellation = cancellationService.transitionOrder({
      orderNumber: fixture.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'cancelled',
      reason: 'cancel while provider is synchronized',
      tracking: null,
      idempotencyKey: `cancel-race-${randomUUID()}`,
      actor,
    });
    await providerEntered;
    const prepared = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    expect(prepared).toMatchObject({ fulfillmentStatus: 'PAID', version: 2 });
    const transitionKey = `transition-during-cancel-${randomUUID()}`;
    await expect(
      service.transitionOrder({
        orderNumber: fixture.order.orderNumber,
        expectedVersion: prepared.version,
        toStatus: 'preparing',
        reason: 'must not overtake pending cancellation',
        tracking: null,
        idempotencyKey: transitionKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'ORDER_CANCELLATION_PENDING' });
    expect(
      await prisma.commandReceipt.findUnique({ where: { idempotencyKey: transitionKey } }),
    ).toBeNull();
    expect(await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } })).toMatchObject(
      {
        fulfillmentStatus: 'PAID',
        version: 2,
      },
    );
    releaseProvider();
    await expect(cancellation).resolves.toMatchObject({ fulfillmentStatus: 'cancelled' });
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: fixture.order.id, toStatus: 'PREPARING' },
      }),
    ).toBe(0);
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: fixture.order.id, action: 'ORDER_CANCELLATION' },
      }),
    ).toBe(1);
  });

  it('[ORD-010][ORD-013] rejects tracking outside shipment and non-meaningful tracking before receipts or Order mutation', async () => {
    const paid = await createFixture();
    const wrongTransitionKey = `tracking-wrong-transition-${randomUUID()}`;
    await expect(
      service.transitionOrder({
        orderNumber: paid.order.orderNumber,
        expectedVersion: 1,
        toStatus: 'preparing',
        reason: 'tracking is not valid while preparing',
        tracking: { carrier: 'Iran Post', trackingNumber: 'EARLY-TRACK', trackingUrl: null },
        idempotencyKey: wrongTransitionKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'TRACKING_TRANSITION_INVALID' });

    const preparing = await createFixture({ status: 'PREPARING' });
    const blankShipmentKey = `tracking-blank-shipment-${randomUUID()}`;
    await expect(
      service.transitionOrder({
        orderNumber: preparing.order.orderNumber,
        expectedVersion: 1,
        toStatus: 'shipped',
        reason: 'blank carrier must not ship',
        tracking: { carrier: '   ', trackingNumber: '   ', trackingUrl: '   ' },
        idempotencyKey: blankShipmentKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'TRACKING_INVALID' });

    const shipped = await createFixture({ status: 'SHIPPED' });
    const blankRevisionKey = `tracking-blank-revision-${randomUUID()}`;
    await expect(
      service.appendTracking({
        orderNumber: shipped.order.orderNumber,
        expectedVersion: 1,
        reason: 'blank revision must not append',
        tracking: { carrier: 'Tipax', trackingNumber: '  ', trackingUrl: null },
        idempotencyKey: blankRevisionKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'TRACKING_INVALID' });

    for (const fixture of [paid, preparing, shipped]) {
      expect(
        await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      ).toMatchObject({
        fulfillmentStatus: fixture.order.fulfillmentStatus,
        version: 1,
      });
      expect(
        await prisma.shipmentTrackingRevision.count({ where: { orderId: fixture.order.id } }),
      ).toBe(0);
    }
    expect(
      await prisma.commandReceipt.count({
        where: {
          idempotencyKey: { in: [wrongTransitionKey, blankShipmentKey, blankRevisionKey] },
        },
      }),
    ).toBe(0);
  });

  it('[ORD-009][ORD-010] rejects transition/tracking key reuse before any secondary Order mutation', async () => {
    const first = await createFixture();
    const second = await createFixture();
    const transitionKey = `transition-fingerprint-${randomUUID()}`;
    const transitionCommand = {
      orderNumber: first.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'preparing' as const,
      reason: 'prepare canonical target',
      tracking: null,
      idempotencyKey: transitionKey,
      actor,
    };
    const transitioned = await service.transitionOrder(transitionCommand);
    const transitionReplay = await service.transitionOrder(transitionCommand);
    expect(transitionReplay.version).toBe(transitioned.version);
    const transitionReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: transitionKey },
    });
    const firstTransitionFacts = await prisma.orderTimelineEvent.count({
      where: { orderId: first.order.id, type: 'fulfillment_transition' },
    });
    const firstTransitionEvents = await prisma.businessEvent.count({
      where: {
        entityType: 'Order',
        entityId: first.order.id,
        type: 'OrderFulfillmentTransitioned',
      },
    });
    await expect(
      service.transitionOrder({
        orderNumber: second.order.orderNumber,
        expectedVersion: 1,
        toStatus: 'preparing',
        reason: 'prepare canonical target',
        tracking: null,
        idempotencyKey: transitionKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      service.transitionOrder({
        orderNumber: first.order.orderNumber,
        expectedVersion: 2,
        toStatus: 'preparing',
        reason: 'changed canonical payload',
        tracking: null,
        idempotencyKey: transitionKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: second.order.id } })).toMatchObject({
      fulfillmentStatus: 'PAID',
      version: 1,
    });
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: second.order.id, type: 'fulfillment_transition' },
      }),
    ).toBe(0);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: first.order.id } })).toMatchObject({
      fulfillmentStatus: 'PREPARING',
      version: 2,
    });
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: first.order.id, type: 'fulfillment_transition' },
      }),
    ).toBe(firstTransitionFacts);
    expect(
      await prisma.businessEvent.count({
        where: {
          entityType: 'Order',
          entityId: first.order.id,
          type: 'OrderFulfillmentTransitioned',
        },
      }),
    ).toBe(firstTransitionEvents);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: transitionKey } }),
    ).toEqual(transitionReceipt);

    const shipped = await createFixture({ status: 'SHIPPED' });
    const otherShipped = await createFixture({ status: 'SHIPPED' });
    const trackingKey = `tracking-fingerprint-${randomUUID()}`;
    const trackingCommand = {
      orderNumber: shipped.order.orderNumber,
      expectedVersion: 1,
      tracking: {
        carrier: 'Iran Post',
        trackingNumber: 'TRACK-ONE',
        trackingUrl: 'https://example.test/track/one',
      },
      reason: 'append canonical tracking',
      idempotencyKey: trackingKey,
      actor,
    };
    const tracked = await service.appendTracking(trackingCommand);
    const trackingReplay = await service.appendTracking(trackingCommand);
    expect(trackingReplay.version).toBe(tracked.version);
    const trackingReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: trackingKey },
    });
    const trackingRevisionFacts = await prisma.shipmentTrackingRevision.count({
      where: { orderId: shipped.order.id },
    });
    const trackingTimelineFacts = await prisma.orderTimelineEvent.count({
      where: { orderId: shipped.order.id, type: 'tracking_updated' },
    });
    const trackingBusinessEvents = await prisma.businessEvent.count({
      where: {
        entityType: 'Order',
        entityId: shipped.order.id,
        type: 'ShipmentTrackingUpdated',
      },
    });
    await expect(
      service.appendTracking({
        orderNumber: otherShipped.order.orderNumber,
        expectedVersion: 1,
        tracking: {
          carrier: 'Iran Post',
          trackingNumber: 'TRACK-ONE',
          trackingUrl: 'https://example.test/track/one',
        },
        reason: 'append canonical tracking',
        idempotencyKey: trackingKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      service.appendTracking({
        orderNumber: shipped.order.orderNumber,
        expectedVersion: 1,
        tracking: {
          carrier: 'Tipax',
          trackingNumber: 'TRACK-TWO',
          trackingUrl: null,
        },
        reason: 'append canonical tracking',
        idempotencyKey: trackingKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: otherShipped.order.id } }),
    ).toMatchObject({ fulfillmentStatus: 'SHIPPED', version: 1 });
    expect(
      await prisma.shipmentTrackingRevision.count({ where: { orderId: otherShipped.order.id } }),
    ).toBe(0);
    expect(
      await prisma.shipmentTrackingRevision.count({ where: { orderId: shipped.order.id } }),
    ).toBe(trackingRevisionFacts);
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: shipped.order.id, type: 'tracking_updated' },
      }),
    ).toBe(trackingTimelineFacts);
    expect(
      await prisma.businessEvent.count({
        where: {
          entityType: 'Order',
          entityId: shipped.order.id,
          type: 'ShipmentTrackingUpdated',
        },
      }),
    ).toBe(trackingBusinessEvents);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: shipped.order.id } })).toMatchObject(
      {
        fulfillmentStatus: 'SHIPPED',
        version: 2,
      },
    );
    expect(trackingReceipt).toMatchObject({
      commandType: 'operations.order.tracking',
      entityId: shipped.order.orderNumber,
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: trackingKey } }),
    ).toEqual(trackingReceipt);
  });

  it('[ORD-005][PAY-002] rejects cancellation key reuse before a second gateway call or restoration', async () => {
    const first = await createFixture();
    const second = await createFixture();
    let calls = 0;
    const countingGateway: RefundGateway = {
      requestRefund: (input) => {
        calls += 1;
        return Promise.resolve({
          provider: 'fake',
          providerReference: `confirmed-${String(calls)}`,
          status: 'confirmed',
          confirmedAt: input.requestedAt,
          failureCode: null,
        });
      },
    };
    const countingService = new OperationsService(
      repository,
      countingGateway,
      transactions,
      () => new Date(now),
    );
    const key = `cancel-fingerprint-${randomUUID()}`;
    const command = {
      orderNumber: first.order.orderNumber,
      expectedVersion: 1,
      toStatus: 'cancelled' as const,
      reason: 'cancel canonical order',
      tracking: null,
      idempotencyKey: key,
      actor,
    };
    await countingService.transitionOrder(command);
    await countingService.transitionOrder(command);
    await expect(
      countingService.transitionOrder({ ...command, orderNumber: second.order.orderNumber }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(calls).toBe(1);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: second.order.id } })).toMatchObject({
      fulfillmentStatus: 'PAID',
      version: 1,
    });
    expect(await prisma.refund.count({ where: { orderId: second.order.id } })).toBe(0);
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: second.order.id, action: 'ORDER_CANCELLATION' },
      }),
    ).toBe(0);
  });

  it('[ORD-009] serializes concurrent different-target claims for one raw key', async () => {
    const first = await createFixture();
    const second = await createFixture();
    const key = `parallel-fingerprint-${randomUUID()}`;
    const results = await Promise.allSettled(
      [first, second].map((fixture) =>
        service.transitionOrder({
          orderNumber: fixture.order.orderNumber,
          expectedVersion: 1,
          toStatus: 'preparing',
          reason: 'one global key contender',
          tracking: null,
          idempotencyKey: key,
          actor,
        }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' },
    });
    const persisted = await prisma.order.findMany({
      where: { id: { in: [first.order.id, second.order.id] } },
      select: { version: true },
    });
    expect(persisted.map((order) => order.version).sort()).toEqual([1, 2]);
    expect(
      await prisma.orderTimelineEvent.count({
        where: {
          orderId: { in: [first.order.id, second.order.id] },
          type: 'fulfillment_transition',
        },
      }),
    ).toBe(1);
    expect(await prisma.commandReceipt.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('[RTE-001][RTE-002][RTE-003][RTE-004][CUS-005] enforces ownership and the inclusive 24-hour boundary', async () => {
    const deliveredAt = new Date('2026-08-03T09:00:00.000Z');
    const eligible = await createFixture({ status: 'DELIVERED', deliveredAt });
    now = new Date('2026-08-04T09:00:00.000Z');
    await expect(
      service.submitReturn(
        eligible.customer.id,
        {
          orderNumber: eligible.order.orderNumber,
          items: [{ orderItemId: eligible.orderItem.id, quantity: 1 }],
          reason: 'اظهار ناقص مشتری',
          unused: false,
          unwashed: true,
          tagsAttached: true,
        },
        `return-${randomUUID()}`,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'RETURN_CONDITIONS_REQUIRED' });
    const request = await service.submitReturn(
      eligible.customer.id,
      {
        orderNumber: eligible.order.orderNumber,
        items: [{ orderItemId: eligible.orderItem.id, quantity: 1 }],
        reason: 'اندازه مناسب نیست',
        unused: true,
        unwashed: true,
        tagsAttached: true,
      },
      `return-${randomUUID()}`,
      randomUUID(),
    );
    expect(request.status).toBe('submitted');
    const expired = await createFixture({ status: 'DELIVERED', deliveredAt });
    now = new Date('2026-08-04T09:00:00.001Z');
    await expect(
      service.submitReturn(
        expired.customer.id,
        {
          orderNumber: expired.order.orderNumber,
          items: [{ orderItemId: expired.orderItem.id, quantity: 1 }],
          reason: 'مهلت گذشته است',
          unused: true,
          unwashed: true,
          tagsAttached: true,
        },
        `return-${randomUUID()}`,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'RETURN_WINDOW_EXPIRED' });
    await expect(
      service.getOwnedOrder(expired.customer.id, eligible.order.orderNumber),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('[RTE-001][RTE-005] binds customer return replay to owner, Order and normalized payload', async () => {
    const deliveredAt = new Date('2026-08-03T09:00:00.000Z');
    const first = await createFixture({ status: 'DELIVERED', deliveredAt });
    const second = await createFixture({ status: 'DELIVERED', deliveredAt });
    now = new Date('2026-08-04T08:00:00.000Z');
    const key = `return-fingerprint-${randomUUID()}`;
    const submission = {
      orderNumber: first.order.orderNumber,
      items: [{ orderItemId: first.orderItem.id, quantity: 1 }],
      reason: 'canonical customer return',
      unused: true,
      unwashed: true,
      tagsAttached: true,
    } as const;
    const created = await service.submitReturn(first.customer.id, submission, key, randomUUID());
    const replay = await service.submitReturn(first.customer.id, submission, key, randomUUID());
    expect(replay.id).toBe(created.id);
    await expect(
      service.submitReturn(
        first.customer.id,
        { ...submission, reason: 'changed customer return payload' },
        key,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      service.submitReturn(
        second.customer.id,
        {
          ...submission,
          orderNumber: second.order.orderNumber,
          items: [{ orderItemId: second.orderItem.id, quantity: 1 }],
        },
        key,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await prisma.returnRequest.count({ where: { orderId: first.order.id } })).toBe(1);
    expect(await prisma.returnRequest.count({ where: { orderId: second.order.id } })).toBe(0);
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: first.order.id, type: 'return_submitted' },
      }),
    ).toBe(1);
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: second.order.id, type: 'return_submitted' },
      }),
    ).toBe(0);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: key } }),
    ).toMatchObject({
      commandType: 'operations.return.submit',
      entityId: `${first.customer.id}:${first.order.orderNumber}`,
    });
  });

  it('[RTE-005][ORD-008] serializes concurrent partial-return confirmations into one Returned transition', async () => {
    const deliveredAt = new Date('2026-08-03T09:00:00.000Z');
    const fixture = await createFixture({
      status: 'DELIVERED',
      deliveredAt,
      itemQuantity: 2,
    });
    now = new Date('2026-08-04T08:00:00.000Z');
    const submission = (suffix: string) =>
      service.submitReturn(
        fixture.customer.id,
        {
          orderNumber: fixture.order.orderNumber,
          items: [{ orderItemId: fixture.orderItem.id, quantity: 1 }],
          reason: `partial return ${suffix}`,
          unused: true,
          unwashed: true,
          tagsAttached: true,
        },
        `partial-return-${suffix}-${randomUUID()}`,
        randomUUID(),
      );
    const first = await submission('first');
    const second = await submission('second');
    let providerCalls = 0;
    let releaseProvider!: () => void;
    let markBothEntered!: () => void;
    const bothEntered = new Promise<void>((resolve) => {
      markBothEntered = resolve;
    });
    const providerRelease = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const gateway: RefundGateway = {
      requestRefund: async (input) => {
        providerCalls += 1;
        const callNumber = providerCalls;
        if (callNumber === 2) markBothEntered();
        await providerRelease;
        return {
          provider: 'fake',
          providerReference: `partial-confirmation-${String(callNumber)}`,
          status: 'confirmed',
          confirmedAt: input.requestedAt,
          failureCode: null,
        };
      },
    };
    const concurrentService = new OperationsService(
      repository,
      gateway,
      transactions,
      () => new Date(now),
    );
    const confirmations = Promise.all([
      concurrentService.approveReturn({
        returnId: first.id,
        reason: 'approve first partial return',
        idempotencyKey: `approve-partial-first-${randomUUID()}`,
        actor,
      }),
      concurrentService.approveReturn({
        returnId: second.id,
        reason: 'approve second partial return',
        idempotencyKey: `approve-partial-second-${randomUUID()}`,
        actor,
      }),
    ]);
    await bothEntered;
    releaseProvider();
    await confirmations;

    expect(providerCalls).toBe(2);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } })).toMatchObject(
      {
        fulfillmentStatus: 'RETURNED',
        version: 2,
      },
    );
    expect(
      await prisma.orderTimelineEvent.count({
        where: {
          orderId: fixture.order.id,
          fromStatus: 'DELIVERED',
          toStatus: 'RETURNED',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.returnRequest.count({
        where: { orderId: fixture.order.id, status: 'COMPLETED' },
      }),
    ).toBe(2);
    expect(
      await prisma.refund.count({ where: { orderId: fixture.order.id, status: 'CONFIRMED' } }),
    ).toBe(2);
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: fixture.order.id, action: 'CUSTOMER_RETURN' },
      }),
    ).toBe(2);
  });

  it('[RTE-005][INV-011][ORD-008] records failed refund then retries confirmation without duplicate restoration', async () => {
    const deliveredAt = new Date('2026-08-03T09:00:00.000Z');
    const fixture = await createFixture({ status: 'DELIVERED', deliveredAt });
    now = new Date('2026-08-04T08:00:00.000Z');
    const request = await service.submitReturn(
      fixture.customer.id,
      {
        orderNumber: fixture.order.orderNumber,
        items: [{ orderItemId: fixture.orderItem.id, quantity: 1 }],
        reason: 'درخواست بازگشت',
        unused: true,
        unwashed: true,
        tagsAttached: true,
      },
      `return-${randomUUID()}`,
      randomUUID(),
    );
    let calls = 0;
    const flaky: RefundGateway = {
      requestRefund: (input) => {
        calls += 1;
        return Promise.resolve(
          calls === 1
            ? {
                provider: 'fake',
                providerReference: 'failed-refund',
                status: 'failed',
                confirmedAt: null,
                failureCode: 'TEMPORARY',
              }
            : {
                provider: 'fake',
                providerReference: 'confirmed-refund',
                status: 'confirmed',
                confirmedAt: input.requestedAt,
                failureCode: null,
              },
        );
      },
    };
    const flakyService = new OperationsService(
      repository,
      flaky,
      transactions,
      () => new Date(now),
    );
    await expect(
      flakyService.approveReturn({
        returnId: request.id,
        reason: 'کالا بررسی و تأیید شد',
        idempotencyKey: `approve-${randomUUID()}`,
        actor,
      }),
    ).rejects.toMatchObject({ code: 'REFUND_PROVIDER_NOT_CONFIRMED' });
    const failed = await repository.getReturn(request.id);
    expect(failed.refund?.status).toBe('failed');
    if (failed.refund === null) throw new Error('Expected failed refund fixture.');
    const confirmed = await flakyService.retryRefund({
      refundId: failed.refund.id,
      reason: 'تلاش دوباره بازپرداخت',
      idempotencyKey: `retry-${randomUUID()}`,
      actor,
    });
    expect(confirmed.status).toBe('confirmed');
    expect(calls).toBe(2);
    expect(await prisma.inventoryMovement.count({ where: { returnRequestId: request.id } })).toBe(
      1,
    );
    expect(
      (await prisma.inventory.findUniqueOrThrow({ where: { skuId: fixture.sku.id } }))
        .physicalQuantity,
    ).toBe(5);
  });

  it('[RTE-005][INV-011] binds approve/reject keys before inventory and provider effects', async () => {
    const deliveredAt = new Date('2026-08-03T09:00:00.000Z');
    const approvedFixture = await createFixture({ status: 'DELIVERED', deliveredAt });
    const rejectedFixture = await createFixture({ status: 'DELIVERED', deliveredAt });
    const untouchedFixture = await createFixture({ status: 'DELIVERED', deliveredAt });
    now = new Date('2026-08-04T08:00:00.000Z');
    const submit = (fixture: Awaited<ReturnType<typeof createFixture>>, suffix: string) =>
      service.submitReturn(
        fixture.customer.id,
        {
          orderNumber: fixture.order.orderNumber,
          items: [{ orderItemId: fixture.orderItem.id, quantity: 1 }],
          reason: `return request ${suffix}`,
          unused: true,
          unwashed: true,
          tagsAttached: true,
        },
        `decision-submit-${suffix}-${randomUUID()}`,
        randomUUID(),
      );
    const approvedRequest = await submit(approvedFixture, 'approved');
    const rejectedRequest = await submit(rejectedFixture, 'rejected');
    const untouchedRequest = await submit(untouchedFixture, 'untouched');
    let providerCalls = 0;
    const gateway: RefundGateway = {
      requestRefund: (input) => {
        providerCalls += 1;
        return Promise.resolve({
          provider: 'fake',
          providerReference: `decision-provider-${String(providerCalls)}`,
          status: 'confirmed',
          confirmedAt: input.requestedAt,
          failureCode: null,
        });
      },
    };
    const decisionService = new OperationsService(
      repository,
      gateway,
      transactions,
      () => new Date(now),
    );
    const approveKey = `approve-fingerprint-${randomUUID()}`;
    const approveCommand = {
      returnId: approvedRequest.id,
      reason: 'approve canonical return',
      idempotencyKey: approveKey,
      actor,
    };
    const approved = await decisionService.approveReturn(approveCommand);
    const approvedReplay = await decisionService.approveReturn(approveCommand);
    expect(approvedReplay.id).toBe(approved.id);
    const approveReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: approveKey },
    });
    const approvedMovementFacts = await prisma.inventoryMovement.count({
      where: { returnRequestId: approvedRequest.id },
    });
    const approvedTimelineFacts = await prisma.orderTimelineEvent.count({
      where: { orderId: approvedFixture.order.id, type: 'return_decided' },
    });
    const approvedBusinessEvents = await prisma.businessEvent.count({
      where: { entityType: 'ReturnRequest', entityId: approvedRequest.id, type: 'ReturnApproved' },
    });
    await expect(
      decisionService.approveReturn({ ...approveCommand, returnId: rejectedRequest.id }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      decisionService.approveReturn({ ...approveCommand, reason: 'changed approval payload' }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(providerCalls).toBe(1);
    expect(await repository.getReturn(rejectedRequest.id)).toMatchObject({
      status: 'submitted',
      refund: null,
    });
    expect(
      await prisma.inventoryMovement.count({ where: { returnRequestId: rejectedRequest.id } }),
    ).toBe(0);
    expect(
      await prisma.inventoryMovement.count({ where: { returnRequestId: approvedRequest.id } }),
    ).toBe(approvedMovementFacts);
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: approvedFixture.order.id, type: 'return_decided' },
      }),
    ).toBe(approvedTimelineFacts);
    expect(
      await prisma.businessEvent.count({
        where: {
          entityType: 'ReturnRequest',
          entityId: approvedRequest.id,
          type: 'ReturnApproved',
        },
      }),
    ).toBe(approvedBusinessEvents);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: approveKey } }),
    ).toEqual(approveReceipt);

    const rejectKey = `reject-fingerprint-${randomUUID()}`;
    const rejectCommand = {
      returnId: rejectedRequest.id,
      reason: 'reject canonical return',
      idempotencyKey: rejectKey,
      actor,
    };
    const rejected = await decisionService.rejectReturn(rejectCommand);
    const rejectedReplay = await decisionService.rejectReturn(rejectCommand);
    expect(rejectedReplay.id).toBe(rejected.id);
    const rejectReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: rejectKey },
    });
    const rejectedTimelineFacts = await prisma.orderTimelineEvent.count({
      where: { orderId: rejectedFixture.order.id, type: 'return_decided' },
    });
    const rejectedBusinessEvents = await prisma.businessEvent.count({
      where: { entityType: 'ReturnRequest', entityId: rejectedRequest.id, type: 'ReturnRejected' },
    });
    await expect(
      decisionService.rejectReturn({ ...rejectCommand, reason: 'changed rejection payload' }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      decisionService.rejectReturn({ ...rejectCommand, returnId: untouchedRequest.id }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      decisionService.approveReturn({
        ...rejectCommand,
        returnId: untouchedRequest.id,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await repository.getReturn(untouchedRequest.id)).toMatchObject({
      status: 'submitted',
      refund: null,
    });
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: untouchedFixture.order.id, type: 'return_decided' },
      }),
    ).toBe(0);
    expect(await repository.getReturn(rejectedRequest.id)).toMatchObject({
      status: 'rejected',
      decisionReason: rejectCommand.reason,
      refund: null,
    });
    expect(
      await prisma.orderTimelineEvent.count({
        where: { orderId: rejectedFixture.order.id, type: 'return_decided' },
      }),
    ).toBe(rejectedTimelineFacts);
    expect(
      await prisma.businessEvent.count({
        where: {
          entityType: 'ReturnRequest',
          entityId: rejectedRequest.id,
          type: 'ReturnRejected',
        },
      }),
    ).toBe(rejectedBusinessEvents);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: rejectKey } }),
    ).toEqual(rejectReceipt);
  });

  it('[PAY-002] binds refund retry keys before provider, attempt and restoration effects', async () => {
    const first = await createFixture();
    const second = await createFixture();
    const failedReplayFixture = await createFixture();
    const firstRefund = await prisma.refund.create({
      data: {
        orderId: first.order.id,
        source: 'CANCELLATION',
        amountRial: first.order.paidTotalRial,
        provider: 'fake',
        status: 'FAILED',
        failureCode: 'TEMPORARY',
        requestedAt: now,
        providerIdempotencyKey: `refund-retry-first-${randomUUID()}`,
      },
    });
    const secondRefund = await prisma.refund.create({
      data: {
        orderId: second.order.id,
        source: 'CANCELLATION',
        amountRial: second.order.paidTotalRial,
        provider: 'fake',
        status: 'FAILED',
        failureCode: 'TEMPORARY',
        requestedAt: now,
        providerIdempotencyKey: `refund-retry-second-${randomUUID()}`,
      },
    });
    const failedReplayRefund = await prisma.refund.create({
      data: {
        orderId: failedReplayFixture.order.id,
        source: 'CANCELLATION',
        amountRial: failedReplayFixture.order.paidTotalRial,
        provider: 'fake',
        status: 'FAILED',
        failureCode: 'TEMPORARY',
        requestedAt: now,
        providerIdempotencyKey: `refund-retry-failed-replay-${randomUUID()}`,
      },
    });
    let calls = 0;
    const gateway: RefundGateway = {
      requestRefund: (input) => {
        calls += 1;
        return Promise.resolve({
          provider: 'fake',
          providerReference: `retry-provider-${String(calls)}`,
          status: 'confirmed',
          confirmedAt: input.requestedAt,
          failureCode: null,
        });
      },
    };
    const retryService = new OperationsService(
      repository,
      gateway,
      transactions,
      () => new Date(now),
    );
    const overlongKey = `refund-overlong-${randomUUID()}`;
    await expect(
      retryService.retryRefund({
        refundId: firstRefund.id,
        reason: 'x'.repeat(501),
        idempotencyKey: overlongKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'REASON_INVALID' });
    expect(calls).toBe(0);
    expect(
      await prisma.commandReceipt.findUnique({ where: { idempotencyKey: overlongKey } }),
    ).toBeNull();
    let failedCalls = 0;
    const failedGateway: RefundGateway = {
      requestRefund: () => {
        failedCalls += 1;
        return Promise.resolve({
          provider: 'fake',
          providerReference: 'retry-still-failed',
          status: 'failed',
          confirmedAt: null,
          failureCode: 'PROVIDER_TEMPORARY',
        });
      },
    };
    const failedService = new OperationsService(
      repository,
      failedGateway,
      transactions,
      () => new Date(now),
    );
    const failedKey = `refund-failed-replay-${randomUUID()}`;
    const failedCommand = {
      refundId: failedReplayRefund.id,
      reason: 'retry that remains provider failed',
      idempotencyKey: failedKey,
      actor,
    };
    await expect(failedService.retryRefund(failedCommand)).rejects.toMatchObject({
      code: 'REFUND_PROVIDER_NOT_CONFIRMED',
    });
    const failedAttemptCount = await prisma.refundAttempt.count({
      where: { refundId: failedReplayRefund.id },
    });
    await expect(failedService.retryRefund(failedCommand)).resolves.toMatchObject({
      id: failedReplayRefund.id,
      status: 'failed',
    });
    expect(failedCalls).toBe(1);
    expect(await prisma.refundAttempt.count({ where: { refundId: failedReplayRefund.id } })).toBe(
      failedAttemptCount,
    );
    const key = `refund-fingerprint-${randomUUID()}`;
    const command = {
      refundId: firstRefund.id,
      reason: 'retry canonical refund',
      idempotencyKey: key,
      actor,
    };
    const confirmed = await retryService.retryRefund(command);
    const replay = await retryService.retryRefund(command);
    expect(replay.id).toBe(confirmed.id);
    const retryReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: key },
    });
    const firstRefundAttempts = await prisma.refundAttempt.count({
      where: { refundId: firstRefund.id },
    });
    const firstRestorationFacts = await prisma.inventoryMovement.count({
      where: { orderId: first.order.id, action: 'ORDER_CANCELLATION' },
    });
    const firstRefundEvents = await prisma.businessEvent.count({
      where: { entityType: 'Refund', entityId: firstRefund.id, type: 'RefundStatusChanged' },
    });
    await expect(
      retryService.retryRefund({ ...command, reason: 'changed retry payload' }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      retryService.retryRefund({ ...command, refundId: secondRefund.id }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(calls).toBe(1);
    expect(await prisma.refundAttempt.count({ where: { refundId: firstRefund.id } })).toBe(
      firstRefundAttempts,
    );
    expect(await prisma.refundAttempt.count({ where: { refundId: secondRefund.id } })).toBe(0);
    expect(await prisma.refund.findUniqueOrThrow({ where: { id: secondRefund.id } })).toMatchObject(
      {
        status: 'FAILED',
        failureCode: 'TEMPORARY',
      },
    );
    expect(await prisma.order.findUniqueOrThrow({ where: { id: second.order.id } })).toMatchObject({
      fulfillmentStatus: 'PAID',
      version: 1,
    });
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: second.order.id, action: 'ORDER_CANCELLATION' },
      }),
    ).toBe(0);
    expect(
      await prisma.inventoryMovement.count({
        where: { orderId: first.order.id, action: 'ORDER_CANCELLATION' },
      }),
    ).toBe(firstRestorationFacts);
    expect(
      await prisma.businessEvent.count({
        where: { entityType: 'Refund', entityId: firstRefund.id, type: 'RefundStatusChanged' },
      }),
    ).toBe(firstRefundEvents);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: key } }),
    ).toEqual(retryReceipt);
  });

  it('[PRC-008][PRC-009][INV-010] applies valid bulk targets and reports stale targets as a partial failure', async () => {
    const one = await createFixture();
    const two = await createFixture();
    now = new Date('2026-08-04T09:00:00.000Z');
    const preview = await service.previewInventoryBulk({
      filters: {
        skuIds: [one.sku.id, two.sku.id],
        productIds: [],
        categoryIds: [],
        statuses: [],
        sizes: [],
      },
      action: 'production',
      quantity: 2,
      reason: 'ورود تولید گروهی',
      actor,
    });
    await prisma.inventory.update({
      where: { skuId: two.sku.id },
      data: { physicalQuantity: { increment: 1 }, version: { increment: 1 } },
    });
    const applied = await service.applyBulkOperation({
      id: preview.id,
      expectedVersion: preview.version,
      idempotencyKey: `bulk-apply-${randomUUID()}`,
      actor,
    });
    expect(applied.status).toBe('partial_failed');
    expect(applied.items.map((item) => item.status).sort()).toEqual(['applied', 'failed']);
    expect(
      (await prisma.inventory.findUniqueOrThrow({ where: { skuId: one.sku.id } })).physicalQuantity,
    ).toBe(6);
    expect(
      (await prisma.inventory.findUniqueOrThrow({ where: { skuId: two.sku.id } })).physicalQuantity,
    ).toBe(5);
  });

  it('[INV-010][INV-011] records a synchronized concurrent inventory update as one partial bulk failure', async () => {
    const one = await createFixture();
    const two = await createFixture();
    const preview = await service.previewInventoryBulk({
      filters: {
        skuIds: [one.sku.id, two.sku.id],
        productIds: [],
        categoryIds: [],
        statuses: [],
        sizes: [],
      },
      action: 'production',
      quantity: 2,
      reason: 'synchronized concurrent inventory preview',
      actor,
    });
    let releaseConcurrentUpdate!: () => void;
    let markInventoryLocked!: () => void;
    const inventoryLocked = new Promise<void>((resolve) => {
      markInventoryLocked = resolve;
    });
    const concurrentRelease = new Promise<void>((resolve) => {
      releaseConcurrentUpdate = resolve;
    });
    const concurrentUpdate = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "sku_id" FROM "inventory" WHERE "sku_id" = ${two.sku.id}::uuid FOR UPDATE`;
      markInventoryLocked();
      await concurrentRelease;
      await transaction.inventory.update({
        where: { skuId: two.sku.id },
        data: { physicalQuantity: { increment: 1 }, version: { increment: 1 } },
      });
    });
    await inventoryLocked;
    const apply = service.applyBulkOperation({
      id: preview.id,
      expectedVersion: preview.version,
      idempotencyKey: `bulk-concurrent-${randomUUID()}`,
      actor,
    });
    releaseConcurrentUpdate();
    await concurrentUpdate;
    const applied = await apply;
    expect(applied.status).toBe('partial_failed');
    expect(applied.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skuId: two.sku.id,
          status: 'failed',
          failureCode: 'STALE_INVENTORY_VERSION',
        }),
        expect.objectContaining({ skuId: one.sku.id, status: 'applied', failureCode: null }),
      ]),
    );
    expect(
      await prisma.inventoryMovement.count({
        where: { skuId: two.sku.id, idempotencyKey: { startsWith: 'm6f:' } },
      }),
    ).toBe(0);
    expect(await service.getBulkOperation(preview.id, actor)).toMatchObject({
      status: 'partial_failed',
      version: 2,
    });
  });

  it('[PRC-008][PRC-009] previews and idempotently applies an exact bulk price change', async () => {
    const fixture = await createFixture();
    now = new Date('2026-08-04T09:00:00.000Z');
    const preview = await service.previewPriceBulk({
      filters: {
        skuIds: [fixture.sku.id],
        productIds: [],
        categoryIds: [],
        statuses: [],
        sizes: [],
      },
      adjustment: { type: 'percentage_increase', value: 10 },
      reason: 'افزایش کنترل‌شدهٔ ده درصدی',
      actor: superActor,
    });
    expect(preview.items[0]?.beforeValue).toBe(12_000_000);
    expect(preview.items[0]?.proposedValue).toBe(13_200_000);
    const forbiddenKey = `bulk-price-forbidden-${randomUUID()}`;
    await expect(
      service.applyBulkOperation({
        id: preview.id,
        expectedVersion: preview.version,
        idempotencyKey: forbiddenKey,
        actor,
      }),
    ).rejects.toMatchObject({ kind: 'forbidden', code: 'BULK_OPERATION_FORBIDDEN' });
    expect(
      await prisma.commandReceipt.findUnique({ where: { idempotencyKey: forbiddenKey } }),
    ).toBeNull();
    await expect(service.getBulkOperation(preview.id, actor)).rejects.toMatchObject({
      kind: 'forbidden',
      code: 'BULK_OPERATION_FORBIDDEN',
    });
    expect(
      Number(
        (await prisma.currentSkuPrice.findUniqueOrThrow({ where: { skuId: fixture.sku.id } }))
          .amountRial,
      ),
    ).toBe(12_000_000);
    const idempotencyKey = `bulk-price-${randomUUID()}`;
    const applied = await service.applyBulkOperation({
      id: preview.id,
      expectedVersion: preview.version,
      idempotencyKey,
      actor: superActor,
    });
    const replay = await service.applyBulkOperation({
      id: preview.id,
      expectedVersion: preview.version,
      idempotencyKey,
      actor: superActor,
    });
    expect(applied.status).toBe('applied');
    expect(replay.version).toBe(applied.version);
    expect(
      Number(
        (await prisma.currentSkuPrice.findUniqueOrThrow({ where: { skuId: fixture.sku.id } }))
          .amountRial,
      ),
    ).toBe(13_200_000);
  });

  it('[PRC-008][INV-010] rejects bulk-apply target/version reuse before the second item loop', async () => {
    const first = await createFixture();
    const second = await createFixture();
    now = new Date('2026-08-04T09:00:00.000Z');
    const preview = (skuId: string, reason: string) =>
      service.previewInventoryBulk({
        filters: {
          skuIds: [skuId],
          productIds: [],
          categoryIds: [],
          statuses: [],
          sizes: [],
        },
        action: 'production',
        quantity: 2,
        reason,
        actor,
      });
    const firstPreview = await preview(first.sku.id, 'first canonical bulk preview');
    const secondPreview = await preview(second.sku.id, 'second canonical bulk preview');
    const key = `bulk-fingerprint-${randomUUID()}`;
    const command = {
      id: firstPreview.id,
      expectedVersion: firstPreview.version,
      idempotencyKey: key,
      actor,
    };
    const applied = await service.applyBulkOperation(command);
    const replay = await service.applyBulkOperation(command);
    expect(replay.version).toBe(applied.version);
    const bulkReceipt = await prisma.commandReceipt.findUniqueOrThrow({
      where: { idempotencyKey: key },
    });
    const firstBulkMovements = await prisma.inventoryMovement.count({
      where: { skuId: first.sku.id, action: 'PRODUCTION' },
    });
    const firstBulkEvents = await prisma.businessEvent.count({
      where: {
        entityType: 'BulkOperation',
        entityId: firstPreview.id,
        type: 'BulkInventoryApplied',
      },
    });
    await expect(
      service.applyBulkOperation({ ...command, expectedVersion: firstPreview.version + 1 }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(
      service.applyBulkOperation({
        ...command,
        id: secondPreview.id,
        expectedVersion: secondPreview.version,
      }),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await service.getBulkOperation(secondPreview.id, actor)).toMatchObject({
      status: 'previewed',
      version: 1,
      items: [expect.objectContaining({ status: 'valid' })],
    });
    expect(
      await prisma.inventory.findUniqueOrThrow({ where: { skuId: second.sku.id } }),
    ).toMatchObject({ physicalQuantity: 4, version: 1 });
    expect(
      await prisma.inventoryMovement.count({
        where: { skuId: second.sku.id, action: 'PRODUCTION' },
      }),
    ).toBe(0);
    expect(
      await prisma.commandReceipt.findUniqueOrThrow({ where: { idempotencyKey: key } }),
    ).toEqual(bulkReceipt);
    expect(bulkReceipt).toMatchObject({
      commandType: 'operations.bulk.apply',
      entityId: firstPreview.id,
    });
    expect(
      await prisma.inventoryMovement.count({
        where: { skuId: first.sku.id, action: 'PRODUCTION' },
      }),
    ).toBe(firstBulkMovements);
    expect(
      await prisma.businessEvent.count({
        where: {
          entityType: 'BulkOperation',
          entityId: firstPreview.id,
          type: 'BulkInventoryApplied',
        },
      }),
    ).toBe(firstBulkEvents);
  });

  it('[INV-013][INV-014] serializes concurrent Instagram-channel stock decrements without negative inventory', async () => {
    const fixture = await createFixture({ physicalQuantity: 3 });
    const catalog = new PrismaCatalogRepository(prismaService);
    const results = await Promise.allSettled([
      catalog.applyInventoryAction(
        fixture.sku.id,
        { action: 'instagram_sale', quantity: 2, reason: 'فروش اینستاگرام اول' },
        `ig-${randomUUID()}`,
        { actorId: 'admin-instagram', role: 'instagram_admin', correlationId: randomUUID() },
      ),
      catalog.applyInventoryAction(
        fixture.sku.id,
        { action: 'instagram_sale', quantity: 2, reason: 'فروش اینستاگرام دوم' },
        `ig-${randomUUID()}`,
        { actorId: 'admin-instagram', role: 'instagram_admin', correlationId: randomUUID() },
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { skuId: fixture.sku.id },
    });
    expect(inventory.physicalQuantity).toBe(1);
    expect(inventory.reservedQuantity).toBe(0);
    const returned = await catalog.applyInventoryAction(
      fixture.sku.id,
      { action: 'instagram_return', quantity: 2, reason: 'بازگشت فروش اینستاگرام با رسید کانال' },
      `ig-return-${randomUUID()}`,
      { actorId: 'admin-instagram', role: 'instagram_admin', correlationId: randomUUID() },
    );
    expect(returned.physicalQuantity).toBe(3);
    expect(
      await prisma.inventoryMovement.count({
        where: { skuId: fixture.sku.id, action: 'INSTAGRAM_RETURN' },
      }),
    ).toBe(1);
  });
});
