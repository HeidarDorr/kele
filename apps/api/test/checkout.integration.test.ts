import { randomInt, randomUUID } from 'node:crypto';
import {
  CartLineKind,
  CartLineStatus,
  DatabaseJobStatus,
  PrismaClient,
  PublicationStatus,
  ReservationStatus,
} from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import { PrismaCheckoutCartAdapter } from '../src/modules/cart/infrastructure/prisma-checkout-cart.adapter.js';
import { PrismaCheckoutCatalogAdapter } from '../src/modules/catalog/infrastructure/prisma-checkout-catalog.adapter.js';
import { CheckoutJobService } from '../src/modules/checkout/application/checkout-job.service.js';
import { CheckoutService } from '../src/modules/checkout/application/checkout.service.js';
import type { CheckoutOutfitPort } from '../src/modules/checkout/application/checkout-outfit.contract.js';
import type { CheckoutCatalogPort } from '../src/modules/catalog/application/checkout-catalog.contract.js';
import { PaymentService } from '../src/modules/checkout/application/payment.service.js';
import { PrismaCheckoutRepository } from '../src/modules/checkout/infrastructure/prisma-checkout.repository.js';
import { FakePaymentAdapter } from '../src/modules/foundation/infrastructure/fake-payment.adapter.js';
import { PrismaCheckoutCustomerAdapter } from '../src/modules/identity/infrastructure/prisma-checkout-customer.adapter.js';

const prisma = new PrismaClient();
const runId = randomUUID();
const fakeCallbackKey = 'm4-integration-fake-payment-signing-key-000001';
const customerIds = new Set<string>();
const cartIds = new Set<string>();
const productIds = new Set<string>();
const variantIds = new Set<string>();
const skuIds = new Set<string>();
const policyIds = new Set<string>();
const outfitIds = new Set<string>();
const outfitRevisionIds = new Set<string>();
let mobileCounter = randomInt(1_000_000, 8_000_000);

type Fixture = Awaited<ReturnType<typeof createFixture>>;

function createServices(
  clock: () => Date = () => new Date(),
  outfits: CheckoutOutfitPort = { getOutfitForCheckout: () => Promise.resolve(null) },
) {
  const transactions = new PrismaTransactionContext(prisma as unknown as PrismaService);
  const repository = new PrismaCheckoutRepository(transactions);
  const carts = new PrismaCheckoutCartAdapter(transactions);
  const customers = new PrismaCheckoutCustomerAdapter(transactions);
  const catalog = new PrismaCheckoutCatalogAdapter(transactions);
  const fake = new FakePaymentAdapter(fakeCallbackKey);
  const checkouts = new CheckoutService(
    repository,
    carts,
    customers,
    catalog,
    outfits,
    transactions,
    clock,
  );
  const payments = new PaymentService(
    repository,
    fake,
    fake,
    catalog,
    carts,
    transactions,
    'http://localhost:3000',
    clock,
  );
  const jobs = new CheckoutJobService(repository, checkouts, transactions, clock);
  return { transactions, repository, carts, customers, catalog, fake, checkouts, payments, jobs };
}

async function createOutfitRevision() {
  const suffix = randomUUID();
  const outfit = await prisma.outfit.create({ data: { slug: `checkout-outfit-${suffix}` } });
  outfitIds.add(outfit.id);
  const revision = await prisma.outfitRevision.create({
    data: {
      outfitId: outfit.id,
      revisionNumber: 1,
      name: 'استایل یکپارچهٔ پرداخت',
      description: 'ویرایش موقت آزمون Checkout',
    },
  });
  outfitRevisionIds.add(revision.id);
  return revision;
}

function outfitPort(input: {
  revisionId: string;
  components: ReadonlyArray<{
    skuId: string;
    skuCode: string;
    productName: string;
    quantity: number;
    available: number;
  }>;
  amountRial?: number;
}): CheckoutOutfitPort {
  return {
    getOutfitForCheckout: (revisionId, size) =>
      Promise.resolve(
        revisionId === input.revisionId && size === 'LOOK-M'
          ? {
              revisionId,
              revisionNumber: 1,
              size,
              sizeLabel: 'متوسط',
              title: 'استایل یکپارچهٔ پرداخت',
              unitPriceRial: input.amountRial ?? 20_000_000,
              image: null,
              availableQuantity: Math.min(
                ...input.components.map((item) => Math.floor(item.available / item.quantity)),
              ),
              purchasable: true,
              components: input.components.map((item, displayOrder) => ({
                outfitItemId: randomUUID(),
                skuId: item.skuId,
                skuCode: item.skuCode,
                productName: item.productName,
                colorName: 'مشکی',
                sizeLabel: displayOrder === 0 ? 'کت ۴۰' : 'شلوار ۴۲',
                quantityPerOutfit: item.quantity,
                availableQuantity: item.available,
                displayOrder,
              })),
            }
          : null,
      ),
  };
}

async function createSku(input: { physicalQuantity: number; amountRial: number }) {
  const suffix = randomUUID();
  const product = await prisma.product.create({
    data: {
      name: `محصول پرداخت ${suffix.slice(0, 8)}`,
      slug: `m4-payment-${suffix}`,
      description: 'محصول قطعی آزمون پرداخت و رزرو',
      status: PublicationStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
  productIds.add(product.id);
  const variant = await prisma.colorVariant.create({
    data: {
      productId: product.id,
      name: 'مشکی',
      normalizedColorCode: `black-${suffix.slice(0, 30)}`,
      status: PublicationStatus.PUBLISHED,
    },
  });
  variantIds.add(variant.id);
  const sku = await prisma.sku.create({
    data: {
      colorVariantId: variant.id,
      code: `M4-${suffix.replaceAll('-', '').slice(0, 20).toUpperCase()}`,
      normalizedSize: 'm',
      displaySize: 'M',
      status: PublicationStatus.PUBLISHED,
      inventory: { create: { physicalQuantity: input.physicalQuantity } },
    },
  });
  skuIds.add(sku.id);
  const price = await prisma.priceRecord.create({
    data: {
      skuId: sku.id,
      amountRial: BigInt(input.amountRial),
      actorId: 'm4-integration',
      reason: 'قیمت آزمون نقطهٔ پرداخت',
    },
  });
  await prisma.currentSkuPrice.create({
    data: { skuId: sku.id, priceRecordId: price.id, amountRial: BigInt(input.amountRial) },
  });
  return { productId: product.id, variantId: variant.id, skuId: sku.id };
}

async function createCustomerCart(input: {
  skuId: string;
  quantity?: number;
  snapshotPriceRial?: number;
  province?: string;
  city?: string;
  lineStatus?: CartLineStatus;
}) {
  mobileCounter += 1;
  const customer = await prisma.customer.create({
    data: {
      mobile: `+98912${String(mobileCounter).padStart(7, '0')}`,
      firstName: 'کاربر',
      lastName: 'پرداخت',
    },
  });
  customerIds.add(customer.id);
  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      recipientName: 'کاربر پرداخت',
      recipientMobile: customer.mobile,
      province: input.province ?? 'تهران',
      city: input.city ?? 'تهران',
      addressLine: 'خیابان آزمون، پلاک ۴',
      postalCode: '1234567890',
      isDefault: true,
    },
  });
  const cart = await prisma.cart.create({ data: { customerId: customer.id } });
  cartIds.add(cart.id);
  const line = await prisma.cartLine.create({
    data: {
      cartId: cart.id,
      kind: CartLineKind.PRODUCT,
      skuId: input.skuId,
      titleSnapshot: 'عنوان قدیمی سبد',
      selectionSnapshot: 'مشکی / M',
      skuCodeSnapshot: 'SNAPSHOT-SKU',
      quantity: input.quantity ?? 1,
      status: input.lineStatus ?? CartLineStatus.AVAILABLE,
      unitPriceRial: BigInt(input.snapshotPriceRial ?? 1_000_000),
    },
  });
  return {
    customerId: customer.id,
    addressId: address.id,
    cartId: cart.id,
    cartLineId: line.id,
    skuId: input.skuId,
  };
}

async function createOutfitCustomerCart(input: { revisionId: string; productSkuId?: string }) {
  mobileCounter += 1;
  const customer = await prisma.customer.create({
    data: {
      mobile: `+98912${String(mobileCounter).padStart(7, '0')}`,
      firstName: 'کاربر',
      lastName: 'Outfit',
    },
  });
  customerIds.add(customer.id);
  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      recipientName: 'کاربر Outfit',
      recipientMobile: customer.mobile,
      province: 'تهران',
      city: 'تهران',
      addressLine: 'خیابان آزمون Outfit، پلاک ۵',
      postalCode: '1234567890',
      isDefault: true,
    },
  });
  const cart = await prisma.cart.create({ data: { customerId: customer.id } });
  cartIds.add(cart.id);
  await prisma.cartLine.create({
    data: {
      cartId: cart.id,
      kind: CartLineKind.OUTFIT,
      outfitRevisionId: input.revisionId,
      outfitRevisionNumber: 1,
      outfitSize: 'LOOK-M',
      titleSnapshot: 'استایل یکپارچهٔ پرداخت',
      selectionSnapshot: 'متوسط',
      quantity: 1,
      status: CartLineStatus.AVAILABLE,
      unitPriceRial: 20_000_000n,
    },
  });
  if (input.productSkuId) {
    await prisma.cartLine.create({
      data: {
        cartId: cart.id,
        kind: CartLineKind.PRODUCT,
        skuId: input.productSkuId,
        titleSnapshot: 'محصول مشترک',
        selectionSnapshot: 'مشکی / M',
        skuCodeSnapshot: 'SHARED-SKU',
        quantity: 1,
        status: CartLineStatus.AVAILABLE,
        unitPriceRial: 7_000_000n,
      },
    });
  }
  return { customerId: customer.id, addressId: address.id, cartId: cart.id };
}

async function createFixture(input: {
  physicalQuantity?: number;
  amountRial?: number;
  quantity?: number;
  snapshotPriceRial?: number;
  province?: string;
  city?: string;
}) {
  const sku = await createSku({
    physicalQuantity: input.physicalQuantity ?? 2,
    amountRial: input.amountRial ?? 12_000_000,
  });
  return {
    ...sku,
    ...(await createCustomerCart({
      skuId: sku.skuId,
      ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
      ...(input.snapshotPriceRial === undefined
        ? {}
        : { snapshotPriceRial: input.snapshotPriceRial }),
      ...(input.province === undefined ? {} : { province: input.province }),
      ...(input.city === undefined ? {} : { city: input.city }),
    })),
  };
}

async function reserve(fixture: Fixture, services = createServices()) {
  const checkout = await services.checkouts.createCheckout({
    customerId: fixture.customerId,
    cartId: fixture.cartId,
    addressId: fixture.addressId,
    deliveryMethod: 'iran_post',
    idempotencyKey: `checkout-${randomUUID()}`,
    correlationId: randomUUID(),
  });
  return { services, checkout };
}

async function startPayment(
  fixture: Fixture,
  checkoutId: string,
  services: ReturnType<typeof createServices>,
) {
  return services.payments.startPayment({
    customerId: fixture.customerId,
    checkoutSessionId: checkoutId,
    idempotencyKey: `payment-${randomUUID()}`,
    correlationId: randomUUID(),
  });
}

beforeAll(async () => {
  const latest = await prisma.shippingPolicyVersion.aggregate({ _max: { version: true } });
  const policy = await prisma.shippingPolicyVersion.create({
    data: {
      version: (latest._max.version ?? 0) + 1,
      freeShippingThresholdRial: 50_000_000n,
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      actorId: 'm4-integration',
      reason: `Milestone 4 integration ${runId}`,
      methods: {
        create: [
          {
            code: 'IRAN_POST',
            localizedName: 'پست ایران',
            fixedPriceRial: 800_000n,
            enabled: true,
            displayOrder: 0,
          },
          {
            code: 'TIPAX',
            localizedName: 'تیپاکس',
            fixedPriceRial: 1_200_000n,
            enabled: true,
            displayOrder: 1,
          },
          {
            code: 'TEHRAN_LOCAL_COURIER',
            localizedName: 'پیک محلی تهران',
            fixedPriceRial: 1_500_000n,
            enabled: true,
            displayOrder: 2,
          },
        ],
      },
    },
  });
  policyIds.add(policy.id);
});

afterAll(async () => {
  try {
    const checkouts = await prisma.checkoutSession.findMany({
      where: { customerId: { in: [...customerIds] } },
      select: { id: true },
    });
    const checkoutIds = checkouts.map((item) => item.id);
    const attempts = await prisma.paymentAttempt.findMany({
      where: { checkoutSessionId: { in: checkoutIds } },
      select: { id: true },
    });
    const attemptIds = attempts.map((item) => item.id);
    const orders = await prisma.order.findMany({
      where: { checkoutSessionId: { in: checkoutIds } },
      select: { id: true },
    });
    const orderIds = orders.map((item) => item.id);
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
    await prisma.inventoryMovement.deleteMany({ where: { skuId: { in: [...skuIds] } } });
    await prisma.businessEvent.deleteMany({
      where: {
        entityId: {
          in: [...checkoutIds, ...attemptIds, ...orderIds, ...skuIds, ...policyIds],
        },
      },
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
    await prisma.cartNotice.deleteMany({ where: { cartId: { in: [...cartIds] } } });
    await prisma.cartLine.deleteMany({ where: { cartId: { in: [...cartIds] } } });
    await prisma.cart.deleteMany({ where: { id: { in: [...cartIds] } } });
    await prisma.outfitRevision.deleteMany({ where: { id: { in: [...outfitRevisionIds] } } });
    await prisma.outfit.deleteMany({ where: { id: { in: [...outfitIds] } } });
    await prisma.address.deleteMany({ where: { customerId: { in: [...customerIds] } } });
    await prisma.customerSession.deleteMany({ where: { customerId: { in: [...customerIds] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [...customerIds] } } });
    await prisma.currentSkuPrice.deleteMany({ where: { skuId: { in: [...skuIds] } } });
    await prisma.priceRecord.deleteMany({ where: { skuId: { in: [...skuIds] } } });
    await prisma.inventory.deleteMany({ where: { skuId: { in: [...skuIds] } } });
    await prisma.sku.deleteMany({ where: { id: { in: [...skuIds] } } });
    await prisma.colorVariant.deleteMany({ where: { id: { in: [...variantIds] } } });
    await prisma.product.deleteMany({ where: { id: { in: [...productIds] } } });
    if (policyIds.size > 0) {
      await prisma.shippingMethodVersion.deleteMany({
        where: { policyId: { in: [...policyIds] } },
      });
      await prisma.shippingPolicyVersion.deleteMany({ where: { id: { in: [...policyIds] } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('Milestone 4 checkout/payment/order invariants on PostgreSQL', () => {
  it('[PAY-002][PAY-004][ORD-001][ORD-004][INV-002] creates one immutable paid Order under callback replay and out-of-order delivery', async () => {
    const fixture = await createFixture({
      physicalQuantity: 2,
      amountRial: 12_000_000,
      snapshotPriceRial: 5_000_000,
    });
    const services = createServices();
    const idempotencyKey = `checkout-${randomUUID()}`;
    const command = {
      customerId: fixture.customerId,
      cartId: fixture.cartId,
      addressId: fixture.addressId,
      deliveryMethod: 'iran_post' as const,
      idempotencyKey,
      correlationId: randomUUID(),
    };
    const checkout = await services.checkouts.createCheckout(command);
    const replay = await services.checkouts.createCheckout({
      ...command,
      correlationId: randomUUID(),
    });
    expect(replay.id).toBe(checkout.id);
    expect(checkout.lines[0]?.unitPrice.amountRial).toBe(12_000_000);
    expect(checkout.quote).toMatchObject({
      itemsTotal: { amountRial: 12_000_000 },
      shippingTotal: { amountRial: 800_000 },
      payableTotal: { amountRial: 12_800_000 },
    });
    const changedShipping = await services.checkouts.publishShippingSettings({
      freeShippingThresholdRial: 60_000_000,
      methods: [
        { code: 'iran_post', enabled: true, fixedPriceRial: 1_000_000 },
        { code: 'tipax', enabled: true, fixedPriceRial: 1_400_000 },
        { code: 'tehran_local_courier', enabled: true, fixedPriceRial: 1_700_000 },
      ],
      actorId: 'm4-integration-admin',
      correlationId: randomUUID(),
      reason: 'Verify immutable shipping snapshot after policy change',
      expectedVersion: checkout.shipping.settingsVersion,
    });
    policyIds.add(changedShipping.id);
    expect(changedShipping.version).toBe(checkout.shipping.settingsVersion + 1);

    const attempt = await startPayment(fixture, checkout.id, services);
    const persisted = await services.repository.getOwnedPaymentAttempt(
      fixture.customerId,
      attempt.id,
    );
    const callback = services.fake.simulateCallback(persisted, 'success', new Date());
    const outcomes = await Promise.all([
      services.payments.processCallback('fake', callback.signature, callback.payload, randomUUID()),
      services.payments.processCallback('fake', callback.signature, callback.payload, randomUUID()),
    ]);
    expect(outcomes[0]).toEqual(outcomes[1]);
    expect(outcomes[0]).toMatchObject({ status: 'paid', orderNumber: expect.any(String) });
    const paidOutcome = outcomes[0];
    if (paidOutcome.orderNumber === null) throw new Error('Expected a paid order number.');

    const lateFailure = services.fake.simulateCallback(persisted, 'failed', new Date());
    await expect(
      services.payments.processCallback(
        'fake',
        lateFailure.signature,
        lateFailure.payload,
        randomUUID(),
      ),
    ).resolves.toMatchObject({ status: 'paid', orderNumber: paidOutcome.orderNumber });

    const wrongTransactionPayload = {
      ...callback.payload,
      nonce: randomUUID(),
      providerTransactionId: `forged-transaction-${randomUUID()}`,
    };
    await expect(
      services.payments.processCallback(
        'fake',
        services.fake.signForTest(wrongTransactionPayload),
        wrongTransactionPayload,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_TRANSACTION_MISMATCH' });

    const eventCollisionPayload = {
      ...callback.payload,
      amountRial: callback.payload.amountRial + 1,
    };
    await expect(
      services.payments.processCallback(
        'fake',
        services.fake.signForTest(eventCollisionPayload),
        eventCollisionPayload,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_CALLBACK_EVENT_COLLISION' });

    const price = await prisma.priceRecord.create({
      data: {
        skuId: fixture.skuId,
        amountRial: 99_000_000n,
        actorId: 'm4-snapshot-test',
        reason: 'تغییر بعد از پرداخت',
      },
    });
    await prisma.currentSkuPrice.update({
      where: { skuId: fixture.skuId },
      data: { amountRial: 99_000_000n, priceRecordId: price.id },
    });
    await prisma.address.update({
      where: { id: fixture.addressId },
      data: { addressLine: 'نشانی تغییر یافته پس از پرداخت' },
    });
    const order = await services.repository.getOwnedOrder(
      fixture.customerId,
      paidOutcome.orderNumber,
    );
    expect(order).toMatchObject({
      paidTotalRial: 12_800_000,
      address: { addressLine: 'خیابان آزمون، پلاک ۴' },
      shipping: { chargedPriceRial: 800_000, settingsVersion: checkout.shipping.settingsVersion },
      items: [{ unitPriceRial: 12_000_000, quantity: 1 }],
    });
    expect(await prisma.order.count({ where: { checkoutSessionId: checkout.id } })).toBe(1);
    expect(
      await prisma.inventory.findUniqueOrThrow({ where: { skuId: fixture.skuId } }),
    ).toMatchObject({
      physicalQuantity: 1,
      reservedQuantity: 0,
    });
  });

  it('[INV-001][INV-002] serializes concurrent last-unit reservations without overselling', async () => {
    const sku = await createSku({ physicalQuantity: 1, amountRial: 9_000_000 });
    const first = await createCustomerCart({ skuId: sku.skuId });
    const second = await createCustomerCart({ skuId: sku.skuId });
    const services = createServices();
    const attempts = await Promise.allSettled(
      [first, second].map((fixture) =>
        services.checkouts.createCheckout({
          customerId: fixture.customerId,
          cartId: fixture.cartId,
          addressId: fixture.addressId,
          deliveryMethod: 'iran_post',
          idempotencyKey: `last-unit-${fixture.customerId}`,
          correlationId: randomUUID(),
        }),
      ),
    );
    expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((item) => item.status === 'rejected')).toHaveLength(1);
    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { skuId: sku.skuId } });
    expect(inventory).toMatchObject({ physicalQuantity: 1, reservedQuantity: 1 });
    expect(inventory.physicalQuantity - inventory.reservedQuantity).toBe(0);
    expect(
      await prisma.inventoryReservation.count({
        where: { skuId: sku.skuId, status: ReservationStatus.ACTIVE },
      }),
    ).toBe(1);
  });

  it('[PAY-004][INV-002] resolves an expiry/success race into reconciliation without a duplicate Order', async () => {
    const fixture = await createFixture({ physicalQuantity: 1 });
    let now = new Date();
    const services = createServices(() => now);
    const { checkout } = await reserve(fixture, services);
    const attempt = await startPayment(fixture, checkout.id, services);
    now = new Date(new Date(checkout.expiresAt).getTime() + 1);
    const persisted = await services.repository.getOwnedPaymentAttempt(
      fixture.customerId,
      attempt.id,
    );
    const callback = services.fake.simulateCallback(persisted, 'success', now);
    const race = await Promise.allSettled([
      services.checkouts.expireCheckout(checkout.id, randomUUID()),
      services.payments.processCallback('fake', callback.signature, callback.payload, randomUUID()),
    ]);
    expect(race.every((item) => item.status === 'fulfilled')).toBe(true);
    expect(await prisma.order.count({ where: { checkoutSessionId: checkout.id } })).toBe(0);
    expect(
      await prisma.paymentReconciliation.count({ where: { paymentAttemptId: attempt.id } }),
    ).toBe(1);
    expect(
      await prisma.inventory.findUniqueOrThrow({ where: { skuId: fixture.skuId } }),
    ).toMatchObject({
      physicalQuantity: 1,
      reservedQuantity: 0,
    });
  });

  it('[PAY-004][PAY-005] quarantines client amount tampering and an incomplete reservation', async () => {
    const tamperedFixture = await createFixture({ physicalQuantity: 1 });
    const tampered = await reserve(tamperedFixture);
    const tamperedAttempt = await startPayment(
      tamperedFixture,
      tampered.checkout.id,
      tampered.services,
    );
    await expect(
      tampered.services.payments.completeFakePayment(
        tamperedFixture.customerId,
        tamperedAttempt.id,
        'tampered_amount',
        randomUUID(),
      ),
    ).resolves.toMatchObject({ status: 'reconciliation', orderNumber: null });

    const partialFixture = await createFixture({ physicalQuantity: 1 });
    const partial = await reserve(partialFixture);
    const partialAttempt = await startPayment(
      partialFixture,
      partial.checkout.id,
      partial.services,
    );
    await prisma.$transaction([
      prisma.inventoryReservation.updateMany({
        where: { checkoutSessionId: partial.checkout.id },
        data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
      }),
      prisma.inventory.update({
        where: { skuId: partialFixture.skuId },
        data: { reservedQuantity: 0, version: { increment: 1 } },
      }),
    ]);
    await expect(
      partial.services.payments.completeFakePayment(
        partialFixture.customerId,
        partialAttempt.id,
        'success',
        randomUUID(),
      ),
    ).resolves.toMatchObject({ status: 'reconciliation', orderNumber: null });
    expect(
      await prisma.order.count({
        where: { checkoutSessionId: { in: [tampered.checkout.id, partial.checkout.id] } },
      }),
    ).toBe(0);
  });

  it('[INV-005][INV-006] leases expiry once, retries recovery safely and never duplicates release', async () => {
    const fixture = await createFixture({ physicalQuantity: 2 });
    let mutableNow = new Date();
    const services = createServices(() => mutableNow);
    const { checkout } = await reserve(fixture, services);
    mutableNow = new Date(new Date(checkout.expiresAt).getTime() + 1);
    await prisma.databaseJob.update({
      where: { idempotencyKey: `expire-checkout:${checkout.id}` },
      data: { runAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const claimed = await Promise.all([
      services.jobs.processDueJobs('m4-worker-a', 1),
      services.jobs.processDueJobs('m4-worker-b', 1),
    ]);
    expect(claimed.every((count) => count <= 1)).toBe(true);
    expect(
      await prisma.databaseJob.findUniqueOrThrow({
        where: { idempotencyKey: `expire-checkout:${checkout.id}` },
      }),
    ).toMatchObject({ status: DatabaseJobStatus.COMPLETED, attemptCount: 1 });
    expect(
      await prisma.inventoryMovement.count({
        where: { skuId: fixture.skuId, action: 'RESERVATION_RELEASE' },
      }),
    ).toBe(1);

    const recoveryFixture = await createFixture({ physicalQuantity: 1 });
    const recovery = await reserve(recoveryFixture, services);
    const recoveryAttempt = await startPayment(
      recoveryFixture,
      recovery.checkout.id,
      recovery.services,
    );
    await prisma.databaseJob.update({
      where: { idempotencyKey: `recover-payment:${recoveryAttempt.id}` },
      data: { runAt: new Date('2019-01-01T00:00:00.000Z') },
    });
    await recovery.services.jobs.processDueJobs('m4-recovery-worker', 1);
    expect(
      await prisma.databaseJob.findUniqueOrThrow({
        where: { idempotencyKey: `recover-payment:${recoveryAttempt.id}` },
      }),
    ).toMatchObject({
      status: DatabaseJobStatus.PENDING,
      attemptCount: 1,
      lastErrorCode: 'PAYMENT_RECONCILIATION_PENDING',
    });
    expect(await prisma.order.count({ where: { paymentAttemptId: recoveryAttempt.id } })).toBe(0);
  });

  it('[CRT-007][ORD-001] rejects unavailable and review-blocked carts before any commercial fact', async () => {
    const unavailable = await createFixture({ physicalQuantity: 0 });
    const services = createServices();
    await expect(
      services.checkouts.createCheckout({
        customerId: unavailable.customerId,
        cartId: unavailable.cartId,
        addressId: unavailable.addressId,
        deliveryMethod: 'iran_post',
        idempotencyKey: `unavailable-${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CART_LINE_UNAVAILABLE' });
    await prisma.cartLine.update({
      where: { id: unavailable.cartLineId },
      data: { status: CartLineStatus.REQUIRES_REVIEW },
    });
    await expect(
      services.checkouts.createCheckout({
        customerId: unavailable.customerId,
        cartId: unavailable.cartId,
        addressId: unavailable.addressId,
        deliveryMethod: 'iran_post',
        idempotencyKey: `review-${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CART_REQUIRES_REVIEW' });
    expect(
      await prisma.checkoutSession.count({ where: { customerId: unavailable.customerId } }),
    ).toBe(0);
    expect(await prisma.order.count({ where: { customerId: unavailable.customerId } })).toBe(0);
  });

  it('[OTF-004][OTF-016][ORD-003][ORD-004] pays a mixed Product/Outfit cart and freezes exact component snapshots', async () => {
    const jacket = await createSku({ physicalQuantity: 4, amountRial: 7_000_000 });
    const trouser = await createSku({ physicalQuantity: 4, amountRial: 9_000_000 });
    const revision = await createOutfitRevision();
    const fixture = await createOutfitCustomerCart({
      revisionId: revision.id,
      productSkuId: jacket.skuId,
    });
    const selection = outfitPort({
      revisionId: revision.id,
      components: [
        {
          skuId: jacket.skuId,
          skuCode: 'JACKET-40',
          productName: 'کت مشکی',
          quantity: 1,
          available: 4,
        },
        {
          skuId: trouser.skuId,
          skuCode: 'TROUSER-42',
          productName: 'شلوار مشکی',
          quantity: 2,
          available: 4,
        },
      ],
    });
    const services = createServices(() => new Date(), selection);
    const checkout = await services.checkouts.createCheckout({
      customerId: fixture.customerId,
      cartId: fixture.cartId,
      addressId: fixture.addressId,
      deliveryMethod: 'iran_post',
      idempotencyKey: `mixed-outfit-${randomUUID()}`,
      correlationId: randomUUID(),
    });
    expect(checkout.quote.itemsTotal.amountRial).toBe(27_000_000);
    expect(checkout.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'outfit',
          outfitRevisionId: revision.id,
          outfitRevisionNumber: 1,
          outfitSize: 'LOOK-M',
          outfitComponents: [
            expect.objectContaining({ skuId: jacket.skuId, totalQuantity: 1 }),
            expect.objectContaining({ skuId: trouser.skuId, totalQuantity: 2 }),
          ],
        }),
      ]),
    );
    const attempt = await services.payments.startPayment({
      customerId: fixture.customerId,
      checkoutSessionId: checkout.id,
      idempotencyKey: `mixed-payment-${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const outcome = await services.payments.completeFakePayment(
      fixture.customerId,
      attempt.id,
      'success',
      randomUUID(),
    );
    expect(outcome).toMatchObject({ status: 'paid', orderNumber: expect.any(String) });
    if (!outcome.orderNumber) throw new Error('Mixed Outfit payment did not create an Order.');

    await prisma.product.updateMany({
      where: { id: { in: [jacket.productId, trouser.productId] } },
      data: { name: 'نام تغییر‌یافته پس از پرداخت' },
    });
    const order = await services.repository.getOwnedOrder(fixture.customerId, outcome.orderNumber);
    const outfitItem = order.items.find((item) => item.kind === 'outfit');
    expect(outfitItem).toMatchObject({
      outfitRevisionId: revision.id,
      outfitRevisionNumber: 1,
      outfitSize: 'LOOK-M',
      unitPriceRial: 20_000_000,
      outfitComponents: [
        expect.objectContaining({ productName: 'کت مشکی', skuCode: 'JACKET-40' }),
        expect.objectContaining({
          productName: 'شلوار مشکی',
          skuCode: 'TROUSER-42',
          totalQuantity: 2,
        }),
      ],
    });
    await expect(
      prisma.inventory.findUniqueOrThrow({ where: { skuId: jacket.skuId } }),
    ).resolves.toMatchObject({ physicalQuantity: 2, reservedQuantity: 0 });
    await expect(
      prisma.inventory.findUniqueOrThrow({ where: { skuId: trouser.skuId } }),
    ).resolves.toMatchObject({ physicalQuantity: 2, reservedQuantity: 0 });
  });

  it('[OTF-016][INV-002] rolls back every component and Checkout fact when a later reservation fails', async () => {
    const first = await createSku({ physicalQuantity: 2, amountRial: 4_000_000 });
    const second = await createSku({ physicalQuantity: 2, amountRial: 5_000_000 });
    const revision = await createOutfitRevision();
    const fixture = await createOutfitCustomerCart({ revisionId: revision.id });
    const selection = outfitPort({
      revisionId: revision.id,
      components: [
        {
          skuId: first.skuId,
          skuCode: 'ROLLBACK-A',
          productName: 'جزء اول',
          quantity: 1,
          available: 2,
        },
        {
          skuId: second.skuId,
          skuCode: 'ROLLBACK-B',
          productName: 'جزء دوم',
          quantity: 1,
          available: 2,
        },
      ],
    });
    const base = createServices(() => new Date(), selection);
    const failingCatalog: CheckoutCatalogPort = {
      getProducts: (ids) => base.catalog.getProducts(ids),
      lockProducts: (ids) => base.catalog.lockProducts(ids),
      reserve: async (reservations, actor) => {
        await base.catalog.reserve(reservations.slice(0, 1), actor);
        throw new Error('simulated later component failure');
      },
      release: (reservations, actor, reason) => base.catalog.release(reservations, actor, reason),
      consume: (reservations, actor, orderId) => base.catalog.consume(reservations, actor, orderId),
    };
    const checkouts = new CheckoutService(
      base.repository,
      base.carts,
      base.customers,
      failingCatalog,
      selection,
      base.transactions,
    );
    await expect(
      checkouts.createCheckout({
        customerId: fixture.customerId,
        cartId: fixture.cartId,
        addressId: fixture.addressId,
        deliveryMethod: 'iran_post',
        idempotencyKey: `rollback-outfit-${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow('simulated later component failure');
    expect(
      await prisma.inventory.findMany({
        where: { skuId: { in: [first.skuId, second.skuId] } },
        select: { reservedQuantity: true },
      }),
    ).toEqual([{ reservedQuantity: 0 }, { reservedQuantity: 0 }]);
    expect(await prisma.checkoutSession.count({ where: { cartId: fixture.cartId } })).toBe(0);
  });

  it('[OTF-007][OTF-016][INV-001] gives the last complete Outfit to exactly one concurrent cart', async () => {
    const first = await createSku({ physicalQuantity: 1, amountRial: 4_000_000 });
    const second = await createSku({ physicalQuantity: 1, amountRial: 5_000_000 });
    const revision = await createOutfitRevision();
    const carts = await Promise.all([
      createOutfitCustomerCart({ revisionId: revision.id }),
      createOutfitCustomerCart({ revisionId: revision.id }),
    ]);
    const selection = outfitPort({
      revisionId: revision.id,
      components: [
        {
          skuId: first.skuId,
          skuCode: 'LAST-A',
          productName: 'جزء اول',
          quantity: 1,
          available: 1,
        },
        {
          skuId: second.skuId,
          skuCode: 'LAST-B',
          productName: 'جزء دوم',
          quantity: 1,
          available: 1,
        },
      ],
    });
    const services = createServices(() => new Date(), selection);
    const results = await Promise.allSettled(
      carts.map((fixture) =>
        services.checkouts.createCheckout({
          customerId: fixture.customerId,
          cartId: fixture.cartId,
          addressId: fixture.addressId,
          deliveryMethod: 'iran_post',
          idempotencyKey: `last-outfit-${fixture.customerId}`,
          correlationId: randomUUID(),
        }),
      ),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    const inventory = await prisma.inventory.findMany({
      where: { skuId: { in: [first.skuId, second.skuId] } },
      select: { physicalQuantity: true, reservedQuantity: true },
    });
    expect(inventory).toEqual([
      { physicalQuantity: 1, reservedQuantity: 1 },
      { physicalQuantity: 1, reservedQuantity: 1 },
    ]);
  });
});
