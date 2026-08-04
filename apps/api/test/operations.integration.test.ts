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
  } = {},
) {
  const token = randomUUID().replaceAll('-', '');
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
      itemsSubtotalRial: 12_000_000,
      shippingTotalRial: 800_000,
      payableTotalRial: 12_800_000,
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
      amountRial: 12_800_000,
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
      itemsSubtotalRial: 12_000_000,
      shippingTotalRial: 800_000,
      paidTotalRial: 12_800_000,
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
          quantity: 1,
          unitPriceRial: 12_000_000,
          lineTotalRial: 12_000_000,
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
