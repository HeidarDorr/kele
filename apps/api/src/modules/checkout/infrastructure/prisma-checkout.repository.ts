import {
  CartLineKind,
  CheckoutStatus,
  DatabaseJobStatus,
  DatabaseJobType,
  PaymentAttemptStatus,
  PaymentCallbackResult,
  Prisma,
  ReservationStatus,
  ShippingMethodCode,
} from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  CheckoutRepository,
  CreateCheckoutInput,
  CreateOrderInput,
  CreatePaymentAttemptInput,
} from '../application/checkout.repository.js';
import type {
  AddressSnapshot,
  CallbackReceiptRecord,
  CheckoutSessionRecord,
  DatabaseJobRecord,
  PaymentAttemptRecord,
  PaymentCallbackOutcome,
  OrderSnapshotRecord,
  ShippingMethodCodeValue,
  ShippingSettingsRecord,
} from '../domain/checkout.types.js';

const checkoutInclude = {
  lines: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { outfitComponents: { orderBy: { displayOrder: 'asc' as const } } },
  },
  reservations: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
  order: { select: { orderNumber: true } },
} satisfies Prisma.CheckoutSessionInclude;

const paymentInclude = {
  checkoutSession: { select: { customerId: true } },
  order: { select: { orderNumber: true } },
  reconciliationCases: {
    where: { status: 'OPEN' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { reason: true },
  },
} satisfies Prisma.PaymentAttemptInclude;

type CheckoutRow = Prisma.CheckoutSessionGetPayload<{ include: typeof checkoutInclude }>;
type PaymentRow = Prisma.PaymentAttemptGetPayload<{ include: typeof paymentInclude }>;

const orderInclude = {
  items: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { outfitComponents: { orderBy: { displayOrder: 'asc' as const } } },
  },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const toShippingCode: Record<ShippingMethodCodeValue, ShippingMethodCode> = {
  iran_post: ShippingMethodCode.IRAN_POST,
  tipax: ShippingMethodCode.TIPAX,
  tehran_local_courier: ShippingMethodCode.TEHRAN_LOCAL_COURIER,
};

const fromShippingCode: Record<ShippingMethodCode, ShippingMethodCodeValue> = {
  IRAN_POST: 'iran_post',
  TIPAX: 'tipax',
  TEHRAN_LOCAL_COURIER: 'tehran_local_courier',
};

const checkoutStatusMap: Record<CheckoutStatus, CheckoutSessionRecord['status']> = {
  ACTIVE: 'active',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  RECONCILIATION: 'reconciliation',
};

const paymentStatusMap: Record<PaymentAttemptStatus, PaymentAttemptRecord['status']> = {
  CREATED: 'created',
  REDIRECTED: 'redirected',
  VERIFIED: 'verified',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  RECONCILIATION: 'reconciliation',
};

function safeInteger(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error('Commercial money exceeds safe integer range.');
  return number;
}

function stringProperty(value: Prisma.JsonValue, key: string): string {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Address snapshot is not an object.');
  }
  const property = value[key];
  if (typeof property !== 'string') throw new Error(`Address snapshot ${key} is invalid.`);
  return property;
}

function nullableStringProperty(value: Prisma.JsonValue, key: string): string | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Address snapshot is not an object.');
  }
  const property = value[key];
  if (property === null || property === undefined) return null;
  if (typeof property !== 'string') throw new Error(`Address snapshot ${key} is invalid.`);
  return property;
}

function mapAddress(value: Prisma.JsonValue): AddressSnapshot {
  return {
    recipientName: stringProperty(value, 'recipientName'),
    recipientMobile: stringProperty(value, 'recipientMobile'),
    province: stringProperty(value, 'province'),
    city: stringProperty(value, 'city'),
    addressLine: stringProperty(value, 'addressLine'),
    postalCode: stringProperty(value, 'postalCode'),
    normalizedZone: nullableStringProperty(value, 'normalizedZone'),
  };
}

function mapCheckout(row: CheckoutRow): CheckoutSessionRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    cartId: row.cartId,
    cartVersion: row.cartVersion,
    status: checkoutStatusMap[row.status],
    requestHash: row.requestHash,
    itemsSubtotalRial: safeInteger(row.itemsSubtotalRial),
    shippingTotalRial: safeInteger(row.shippingTotalRial),
    payableTotalRial: safeInteger(row.payableTotalRial),
    address: mapAddress(row.addressSnapshot),
    shipping: {
      method: fromShippingCode[row.shippingMethodCode],
      name: row.shippingMethodName,
      eligible: true,
      ineligibilityCode: null,
      quotedPriceRial: safeInteger(row.shippingTotalRial),
      fixedPriceRial: safeInteger(row.shippingFixedPriceRial),
      eligibilitySubtotalRial: safeInteger(row.itemsSubtotalRial),
      freeShippingApplied: row.freeShippingApplied,
      freeShippingThresholdRial:
        row.freeShippingThresholdRial === null ? null : safeInteger(row.freeShippingThresholdRial),
      settingsVersion: row.shippingSettingsVersion,
    },
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lines: row.lines.map((line) => ({
      id: line.id,
      cartLineId: line.cartLineId,
      kind: line.kind === CartLineKind.PRODUCT ? 'product' : 'outfit',
      skuId: line.skuId,
      outfitRevisionId: line.outfitRevisionId,
      outfitRevisionNumber: line.outfitRevisionNumber,
      outfitSize: line.outfitSize,
      title: line.titleSnapshot,
      selection: line.selectionSnapshot,
      skuCode: line.skuCodeSnapshot,
      image:
        line.imageSnapshot === null
          ? null
          : (line.imageSnapshot as CheckoutSessionRecord['lines'][number]['image']),
      quantity: line.quantity,
      unitPriceRial: safeInteger(line.unitPriceRial),
      lineTotalRial: safeInteger(line.lineTotalRial),
      outfitComponents: line.outfitComponents.map((component) => ({
        outfitItemId: component.outfitItemIdSnapshot,
        skuId: component.skuIdSnapshot,
        skuCode: component.skuCodeSnapshot,
        productName: component.productNameSnapshot,
        colorName: component.colorNameSnapshot,
        sizeLabel: component.sizeLabelSnapshot,
        quantityPerOutfit: component.quantityPerOutfit,
        totalQuantity: component.totalQuantity,
        displayOrder: component.displayOrder,
      })),
    })),
    reservations: row.reservations.map((reservation) => ({
      id: reservation.id,
      checkoutSessionId: reservation.checkoutSessionId,
      checkoutLineId: reservation.checkoutLineId,
      skuId: reservation.skuId,
      quantity: reservation.quantity,
      status:
        reservation.status === ReservationStatus.ACTIVE
          ? 'active'
          : reservation.status === ReservationStatus.CONSUMED
            ? 'consumed'
            : reservation.status === ReservationStatus.RELEASED
              ? 'released'
              : 'expired',
      expiresAt: reservation.expiresAt,
    })),
    orderNumber: row.order?.orderNumber ?? null,
  };
}

function mapPayment(row: PaymentRow): PaymentAttemptRecord {
  if (row.provider !== 'fake') throw new Error('Unsupported persisted payment provider.');
  return {
    id: row.id,
    checkoutSessionId: row.checkoutSessionId,
    customerId: row.checkoutSession.customerId,
    provider: 'fake',
    providerReference: row.providerReference,
    providerTransactionId: row.providerTransactionId,
    status: paymentStatusMap[row.status],
    amountRial: safeInteger(row.amountRial),
    redirectUrl: row.redirectUrl,
    requestHash: row.requestHash,
    createdAt: row.createdAt,
    orderNumber: row.order?.orderNumber ?? null,
    reconciliationReason: row.reconciliationCases[0]?.reason ?? null,
  };
}

function mapOrder(row: OrderRow): OrderSnapshotRecord {
  if (row.paymentProvider !== 'fake') throw new Error('Unsupported persisted payment provider.');
  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    fulfillmentStatus:
      row.fulfillmentStatus.toLocaleLowerCase() as OrderSnapshotRecord['fulfillmentStatus'],
    paidTotalRial: safeInteger(row.paidTotalRial),
    itemsSubtotalRial: safeInteger(row.itemsSubtotalRial),
    shippingTotalRial: safeInteger(row.shippingTotalRial),
    items: row.items.map((item) => ({
      id: item.id,
      kind: item.kind === CartLineKind.PRODUCT ? 'product' : 'outfit',
      title: item.titleSnapshot,
      selection: item.selectionSnapshot,
      skuCode: item.skuCodeSnapshot,
      outfitRevisionId: item.outfitRevisionId,
      outfitRevisionNumber: item.outfitRevisionNumber,
      outfitSize: item.outfitSize,
      quantity: item.quantity,
      unitPriceRial: safeInteger(item.unitPriceRial),
      lineTotalRial: safeInteger(item.lineTotalRial),
      outfitComponents: item.outfitComponents.map((component) => ({
        outfitItemId: component.outfitItemIdSnapshot,
        skuId: component.skuIdSnapshot,
        skuCode: component.skuCodeSnapshot,
        productName: component.productNameSnapshot,
        colorName: component.colorNameSnapshot,
        sizeLabel: component.sizeLabelSnapshot,
        quantityPerOutfit: component.quantityPerOutfit,
        totalQuantity: component.totalQuantity,
        displayOrder: component.displayOrder,
      })),
    })),
    address: mapAddress(row.addressSnapshot),
    shipping: {
      method: fromShippingCode[row.shippingMethodCode],
      name: row.shippingMethodName,
      chargedPriceRial: safeInteger(row.shippingTotalRial),
      fixedPriceRial: safeInteger(row.shippingFixedPriceRial),
      freeShippingApplied: row.freeShippingApplied,
      freeShippingThresholdRial:
        row.freeShippingThresholdRial === null ? null : safeInteger(row.freeShippingThresholdRial),
      settingsVersion: row.shippingSettingsVersion,
    },
    payment: {
      provider: 'fake',
      providerTransactionId: row.providerTransactionId,
    },
  };
}

function paymentStatus(status: 'failed' | 'cancelled' | 'pending'): PaymentAttemptStatus {
  return status === 'failed'
    ? PaymentAttemptStatus.FAILED
    : status === 'cancelled'
      ? PaymentAttemptStatus.CANCELLED
      : PaymentAttemptStatus.PENDING;
}

function callbackResult(status: PaymentCallbackOutcome['status']): PaymentCallbackResult {
  return status === 'paid'
    ? PaymentCallbackResult.PAID
    : status === 'failed'
      ? PaymentCallbackResult.FAILED
      : status === 'cancelled'
        ? PaymentCallbackResult.CANCELLED
        : status === 'pending'
          ? PaymentCallbackResult.PENDING
          : PaymentCallbackResult.RECONCILIATION;
}

function outcomeFromResult(
  result: PaymentCallbackResult,
  paymentAttemptId: string,
  orderNumber: string | null,
): PaymentCallbackOutcome {
  return {
    status:
      result === PaymentCallbackResult.PAID
        ? 'paid'
        : result === PaymentCallbackResult.FAILED
          ? 'failed'
          : result === PaymentCallbackResult.CANCELLED
            ? 'cancelled'
            : result === PaymentCallbackResult.PENDING
              ? 'pending'
              : 'reconciliation',
    paymentAttemptId,
    orderNumber,
  };
}

export class PrismaCheckoutRepository implements CheckoutRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async getEffectiveShippingSettings(now: Date): Promise<ShippingSettingsRecord | null> {
    const policy = await this.transactions.client().shippingPolicyVersion.findFirst({
      where: { effectiveAt: { lte: now } },
      orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
      include: { methods: { orderBy: { displayOrder: 'asc' } } },
    });
    if (policy === null) return null;
    if (policy.eligibilityBasis !== 'order_subtotal') {
      throw new Error('Unsupported shipping eligibility basis.');
    }
    return {
      id: policy.id,
      version: policy.version,
      freeShippingThresholdRial:
        policy.freeShippingThresholdRial === null
          ? null
          : safeInteger(policy.freeShippingThresholdRial),
      eligibilityBasis: 'order_subtotal',
      effectiveAt: policy.effectiveAt,
      reason: policy.reason,
      methods: policy.methods.map((method) => ({
        code: fromShippingCode[method.code],
        name: method.localizedName,
        fixedPriceRial: safeInteger(method.fixedPriceRial),
        enabled: method.enabled,
        displayOrder: method.displayOrder,
      })),
    };
  }

  async createShippingSettings(input: {
    freeShippingThresholdRial: number | null;
    methods: readonly {
      code: ShippingMethodCodeValue;
      name: string;
      fixedPriceRial: number;
      enabled: boolean;
      displayOrder: number;
    }[];
    actorId: string;
    correlationId: string;
    reason: string;
    effectiveAt: Date;
  }): Promise<ShippingSettingsRecord> {
    const client = this.transactions.client();
    await client.$queryRaw<Array<{ locked: number }>>`
      SELECT 1::integer AS locked
      FROM pg_advisory_xact_lock(hashtextextended('shipping-policy-version', 0))
    `;
    const latest = await client.shippingPolicyVersion.findFirst({ orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    const created = await client.shippingPolicyVersion.create({
      data: {
        version,
        freeShippingThresholdRial: input.freeShippingThresholdRial,
        effectiveAt: input.effectiveAt,
        actorId: input.actorId,
        reason: input.reason,
        methods: {
          create: input.methods.map((method) => ({
            code: toShippingCode[method.code],
            localizedName: method.name,
            fixedPriceRial: method.fixedPriceRial,
            enabled: method.enabled,
            displayOrder: method.displayOrder,
          })),
        },
      },
      include: { methods: { orderBy: { displayOrder: 'asc' } } },
    });
    await client.businessEvent.create({
      data: {
        type: 'ShippingSettingsPublished',
        actorId: input.actorId,
        entityType: 'ShippingPolicyVersion',
        entityId: created.id,
        correlationId: input.correlationId,
        payload: { version, reason: input.reason },
      },
    });
    return (await this.getEffectiveShippingSettings(input.effectiveAt)) as ShippingSettingsRecord;
  }

  async findCheckoutReplay(
    customerId: string,
    idempotencyKey: string,
  ): Promise<CheckoutSessionRecord | null> {
    const row = await this.transactions.client().checkoutSession.findUnique({
      where: { customerId_idempotencyKey: { customerId, idempotencyKey } },
      include: checkoutInclude,
    });
    return row === null ? null : mapCheckout(row);
  }

  async findOpenCheckoutForCart(cartId: string): Promise<CheckoutSessionRecord | null> {
    const row = await this.transactions.client().checkoutSession.findFirst({
      where: {
        cartId,
        status: {
          in: [
            CheckoutStatus.ACTIVE,
            CheckoutStatus.PAYMENT_PENDING,
            CheckoutStatus.RECONCILIATION,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: checkoutInclude,
    });
    return row === null ? null : mapCheckout(row);
  }

  async createCheckout(
    input: CreateCheckoutInput,
    correlationId: string,
  ): Promise<CheckoutSessionRecord> {
    const client = this.transactions.client();
    await client.checkoutSession.create({
      data: {
        id: input.id,
        customerId: input.customerId,
        cartId: input.cartId,
        cartVersion: input.cartVersion,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        itemsSubtotalRial: input.itemsSubtotalRial,
        shippingTotalRial: input.shippingTotalRial,
        payableTotalRial: input.payableTotalRial,
        addressSnapshot: input.address,
        shippingMethodCode: toShippingCode[input.shipping.method],
        shippingMethodName: input.shipping.name,
        shippingFixedPriceRial: input.shipping.fixedPriceRial,
        freeShippingThresholdRial: input.shipping.freeShippingThresholdRial,
        freeShippingApplied: input.shipping.freeShippingApplied,
        shippingSettingsVersion: input.shipping.settingsVersion,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        lines: {
          create: input.lines.map((line) => ({
            id: line.id,
            cartLineId: line.cartLineId,
            kind: line.kind === 'product' ? CartLineKind.PRODUCT : CartLineKind.OUTFIT,
            skuId: line.skuId,
            outfitRevisionId: line.outfitRevisionId,
            outfitRevisionNumber: line.outfitRevisionNumber,
            outfitSize: line.outfitSize,
            titleSnapshot: line.title,
            selectionSnapshot: line.selection,
            skuCodeSnapshot: line.skuCode,
            imageSnapshot:
              line.image === null
                ? Prisma.JsonNull
                : (line.image as unknown as Prisma.InputJsonValue),
            quantity: line.quantity,
            unitPriceRial: line.unitPriceRial,
            lineTotalRial: line.lineTotalRial,
            outfitComponents: {
              create: line.outfitComponents.map((component) => ({
                outfitItemIdSnapshot: component.outfitItemId,
                skuIdSnapshot: component.skuId,
                skuCodeSnapshot: component.skuCode,
                productNameSnapshot: component.productName,
                colorNameSnapshot: component.colorName,
                sizeLabelSnapshot: component.sizeLabel,
                quantityPerOutfit: component.quantityPerOutfit,
                totalQuantity: component.totalQuantity,
                displayOrder: component.displayOrder,
              })),
            },
          })),
        },
      },
    });
    await client.inventoryReservation.createMany({
      data: input.reservations.map((reservation) => ({
        id: reservation.id,
        checkoutSessionId: input.id,
        checkoutLineId: reservation.checkoutLineId,
        skuId: reservation.skuId,
        quantity: reservation.quantity,
        expiresAt: input.expiresAt,
      })),
    });
    await client.databaseJob.create({
      data: {
        type: DatabaseJobType.EXPIRE_CHECKOUT,
        idempotencyKey: `expire-checkout:${input.id}`,
        payload: { checkoutSessionId: input.id },
        runAt: input.expiresAt,
      },
    });
    await client.businessEvent.create({
      data: {
        type: 'CheckoutReserved',
        actorId: input.customerId,
        entityType: 'CheckoutSession',
        entityId: input.id,
        correlationId,
        payload: {
          itemsSubtotalRial: input.itemsSubtotalRial,
          shippingTotalRial: input.shippingTotalRial,
          payableTotalRial: input.payableTotalRial,
          shippingSettingsVersion: input.shipping.settingsVersion,
        },
      },
    });
    return this.requireCheckout(input.id);
  }

  async getOwnedCheckout(
    customerId: string,
    checkoutSessionId: string,
  ): Promise<CheckoutSessionRecord> {
    const row = await this.transactions.client().checkoutSession.findFirst({
      where: { id: checkoutSessionId, customerId },
      include: checkoutInclude,
    });
    if (row === null) {
      throw new ApplicationError('not_found', 'CHECKOUT_NOT_FOUND', 'Checkout was not found.');
    }
    return mapCheckout(row);
  }

  async lockCheckout(checkoutSessionId: string): Promise<CheckoutSessionRecord | null> {
    await this.transactions
      .client()
      .$queryRaw(
        Prisma.sql`SELECT id FROM "checkout_sessions" WHERE id = ${checkoutSessionId}::uuid FOR UPDATE`,
      );
    const row = await this.transactions.client().checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      include: checkoutInclude,
    });
    return row === null ? null : mapCheckout(row);
  }

  async markCheckoutExpired(
    checkoutSessionId: string,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    const client = this.transactions.client();
    const current = await client.checkoutSession.findUnique({ where: { id: checkoutSessionId } });
    if (current === null) return;
    await client.inventoryReservation.updateMany({
      where: { checkoutSessionId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.EXPIRED, releasedAt: now },
    });
    if (current.status !== CheckoutStatus.RECONCILIATION) {
      await client.checkoutSession.updateMany({
        where: {
          id: checkoutSessionId,
          status: { in: [CheckoutStatus.ACTIVE, CheckoutStatus.PAYMENT_PENDING] },
        },
        data: { status: CheckoutStatus.EXPIRED, expiredAt: now },
      });
    }
    await client.businessEvent.create({
      data: {
        type: 'CheckoutExpired',
        actorId: 'system-expiry-job',
        entityType: 'CheckoutSession',
        entityId: checkoutSessionId,
        correlationId,
        payload: {},
      },
    });
  }

  async markCheckoutCancelled(
    checkoutSessionId: string,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    const client = this.transactions.client();
    await client.inventoryReservation.updateMany({
      where: { checkoutSessionId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.RELEASED, releasedAt: now },
    });
    await client.checkoutSession.updateMany({
      where: {
        id: checkoutSessionId,
        status: { in: [CheckoutStatus.ACTIVE, CheckoutStatus.PAYMENT_PENDING] },
      },
      data: { status: CheckoutStatus.CANCELLED, cancelledAt: now },
    });
    await client.businessEvent.create({
      data: {
        type: 'CheckoutCancelled',
        actorId: 'system',
        entityType: 'CheckoutSession',
        entityId: checkoutSessionId,
        correlationId,
        payload: {},
      },
    });
  }

  async findPaymentAttemptReplay(
    checkoutSessionId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await this.transactions.client().paymentAttempt.findUnique({
      where: { checkoutSessionId_idempotencyKey: { checkoutSessionId, idempotencyKey } },
      include: paymentInclude,
    });
    return row === null ? null : mapPayment(row);
  }

  async createPaymentAttempt(input: CreatePaymentAttemptInput): Promise<PaymentAttemptRecord> {
    await this.transactions.client().paymentAttempt.create({
      data: {
        id: input.id,
        checkoutSessionId: input.checkoutSessionId,
        provider: input.provider,
        providerReference: input.providerReference,
        status: PaymentAttemptStatus.REDIRECTED,
        amountRial: input.amountRial,
        redirectUrl: input.redirectUrl,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      },
    });
    await this.transactions.client().databaseJob.create({
      data: {
        type: DatabaseJobType.RECOVER_PAYMENT,
        idempotencyKey: `recover-payment:${input.id}`,
        payload: { paymentAttemptId: input.id },
        runAt: new Date(input.createdAt.getTime() + 5 * 60_000),
      },
    });
    return this.requirePayment(input.id);
  }

  async getOwnedPaymentAttempt(
    customerId: string,
    paymentAttemptId: string,
  ): Promise<PaymentAttemptRecord> {
    const row = await this.transactions.client().paymentAttempt.findFirst({
      where: { id: paymentAttemptId, checkoutSession: { customerId } },
      include: paymentInclude,
    });
    if (row === null) {
      throw new ApplicationError('not_found', 'PAYMENT_NOT_FOUND', 'Payment was not found.');
    }
    return mapPayment(row);
  }

  async getPaymentAttemptForRecovery(
    paymentAttemptId: string,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await this.transactions.client().paymentAttempt.findUnique({
      where: { id: paymentAttemptId },
      include: paymentInclude,
    });
    return row === null ? null : mapPayment(row);
  }

  async lockPaymentAttemptByProviderReference(
    provider: 'fake',
    providerReference: string,
  ): Promise<PaymentAttemptRecord | null> {
    await this.transactions
      .client()
      .$queryRaw(
        Prisma.sql`SELECT id FROM "payment_attempts" WHERE provider = ${provider} AND provider_reference = ${providerReference} FOR UPDATE`,
      );
    const row = await this.transactions.client().paymentAttempt.findUnique({
      where: { provider_providerReference: { provider, providerReference } },
      include: paymentInclude,
    });
    if (row === null) return null;
    await this.transactions
      .client()
      .$queryRaw(
        Prisma.sql`SELECT id FROM "checkout_sessions" WHERE id = ${row.checkoutSessionId}::uuid FOR UPDATE`,
      );
    return mapPayment(row);
  }

  async findCallbackReceipt(
    provider: 'fake',
    providerEventId: string,
  ): Promise<CallbackReceiptRecord | null> {
    const receipt = await this.transactions.client().paymentCallbackReceipt.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
      include: {
        paymentAttempt: { select: { id: true } },
        order: { select: { orderNumber: true } },
      },
    });
    return receipt === null
      ? null
      : {
          payloadHash: receipt.payloadHash,
          outcome: outcomeFromResult(
            receipt.result,
            receipt.paymentAttempt.id,
            receipt.order?.orderNumber ?? null,
          ),
        };
  }

  async recordNonSuccessCallback(input: {
    paymentAttempt: PaymentAttemptRecord;
    callback: import('../domain/checkout.types.js').VerifiedPaymentCallback;
    outcome: 'failed' | 'cancelled' | 'pending';
    now: Date;
  }): Promise<PaymentCallbackOutcome> {
    const client = this.transactions.client();
    await client.paymentAttempt.update({
      where: { id: input.paymentAttempt.id },
      data: {
        status: paymentStatus(input.outcome),
        providerTransactionId: input.callback.providerTransactionId,
        failureCode: input.outcome === 'pending' ? null : input.outcome.toUpperCase(),
        updatedAt: input.now,
      },
    });
    await client.checkoutSession.updateMany({
      where: {
        id: input.paymentAttempt.checkoutSessionId,
        status: { in: [CheckoutStatus.ACTIVE, CheckoutStatus.PAYMENT_PENDING] },
      },
      data: {
        status:
          input.outcome === 'pending' ? CheckoutStatus.PAYMENT_PENDING : CheckoutStatus.ACTIVE,
      },
    });
    await client.paymentCallbackReceipt.create({
      data: {
        paymentAttemptId: input.paymentAttempt.id,
        provider: input.callback.provider,
        providerEventId: input.callback.nonce,
        providerTransactionId: input.callback.providerTransactionId,
        payloadHash: input.callback.payloadHash,
        result: callbackResult(input.outcome),
        receivedAt: input.now,
      },
    });
    return {
      status: input.outcome,
      paymentAttemptId: input.paymentAttempt.id,
      orderNumber: null,
    };
  }

  async recordExistingPaidCallback(input: {
    paymentAttempt: PaymentAttemptRecord;
    callback: import('../domain/checkout.types.js').VerifiedPaymentCallback;
    now: Date;
  }): Promise<PaymentCallbackOutcome> {
    if (input.paymentAttempt.orderNumber === null) {
      throw new Error('Paid callback replay requires an existing Order.');
    }
    const order = await this.transactions.client().order.findUnique({
      where: { paymentAttemptId: input.paymentAttempt.id },
      select: { id: true },
    });
    if (order === null) throw new Error('Paid PaymentAttempt is missing its Order.');
    await this.transactions.client().paymentCallbackReceipt.create({
      data: {
        paymentAttemptId: input.paymentAttempt.id,
        provider: input.callback.provider,
        providerEventId: input.callback.nonce,
        providerTransactionId: input.callback.providerTransactionId,
        payloadHash: input.callback.payloadHash,
        result: PaymentCallbackResult.PAID,
        orderId: order.id,
        receivedAt: input.now,
      },
    });
    return {
      status: 'paid',
      paymentAttemptId: input.paymentAttempt.id,
      orderNumber: input.paymentAttempt.orderNumber,
    };
  }

  async createOrder(input: CreateOrderInput): Promise<{ id: string; orderNumber: string }> {
    const order = await this.transactions.client().order.create({
      data: {
        id: input.id,
        orderNumber: input.orderNumber,
        customerId: input.checkout.customerId,
        checkoutSessionId: input.checkout.id,
        paymentAttemptId: input.paymentAttempt.id,
        itemsSubtotalRial: input.checkout.itemsSubtotalRial,
        shippingTotalRial: input.checkout.shippingTotalRial,
        paidTotalRial: input.checkout.payableTotalRial,
        addressSnapshot: input.checkout.address,
        shippingMethodCode: toShippingCode[input.checkout.shipping.method],
        shippingMethodName: input.checkout.shipping.name,
        shippingFixedPriceRial: input.checkout.shipping.fixedPriceRial,
        freeShippingThresholdRial: input.checkout.shipping.freeShippingThresholdRial,
        freeShippingApplied: input.checkout.shipping.freeShippingApplied,
        shippingSettingsVersion: input.checkout.shipping.settingsVersion,
        paymentProvider: input.callback.provider,
        providerTransactionId: input.callback.providerTransactionId,
        paidAt: input.paidAt,
        createdAt: input.paidAt,
        items: {
          create: input.checkout.lines.map((line) => ({
            kind: line.kind === 'product' ? CartLineKind.PRODUCT : CartLineKind.OUTFIT,
            skuId: line.skuId,
            outfitRevisionId: line.outfitRevisionId,
            outfitRevisionNumber: line.outfitRevisionNumber,
            outfitSize: line.outfitSize,
            titleSnapshot: line.title,
            selectionSnapshot: line.selection,
            skuCodeSnapshot: line.skuCode,
            imageSnapshot:
              line.image === null
                ? Prisma.JsonNull
                : (line.image as unknown as Prisma.InputJsonValue),
            quantity: line.quantity,
            unitPriceRial: line.unitPriceRial,
            lineTotalRial: line.lineTotalRial,
            outfitComponents: {
              create: line.outfitComponents.map((component) => ({
                outfitItemIdSnapshot: component.outfitItemId,
                skuIdSnapshot: component.skuId,
                skuCodeSnapshot: component.skuCode,
                productNameSnapshot: component.productName,
                colorNameSnapshot: component.colorName,
                sizeLabelSnapshot: component.sizeLabel,
                quantityPerOutfit: component.quantityPerOutfit,
                totalQuantity: component.totalQuantity,
                displayOrder: component.displayOrder,
              })),
            },
          })),
        },
      },
    });
    return { id: order.id, orderNumber: order.orderNumber };
  }

  async completePaidOrder(input: {
    orderId: string;
    orderNumber: string;
    checkoutSessionId: string;
    paymentAttemptId: string;
    callback: import('../domain/checkout.types.js').VerifiedPaymentCallback;
    paidAt: Date;
    correlationId: string;
  }): Promise<PaymentCallbackOutcome> {
    const client = this.transactions.client();
    const reservations = await client.inventoryReservation.updateMany({
      where: { checkoutSessionId: input.checkoutSessionId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.CONSUMED, consumedAt: input.paidAt },
    });
    if (reservations.count === 0) {
      throw new ApplicationError(
        'conflict',
        'RESERVATION_NOT_ACTIVE',
        'Checkout reservation is no longer active.',
      );
    }
    await client.paymentAttempt.update({
      where: { id: input.paymentAttemptId },
      data: {
        status: PaymentAttemptStatus.VERIFIED,
        providerTransactionId: input.callback.providerTransactionId,
        verifiedAt: input.paidAt,
        failureCode: null,
      },
    });
    await client.checkoutSession.update({
      where: { id: input.checkoutSessionId },
      data: { status: CheckoutStatus.PAID, paidAt: input.paidAt },
    });
    await client.paymentCallbackReceipt.create({
      data: {
        paymentAttemptId: input.paymentAttemptId,
        provider: input.callback.provider,
        providerEventId: input.callback.nonce,
        providerTransactionId: input.callback.providerTransactionId,
        payloadHash: input.callback.payloadHash,
        result: PaymentCallbackResult.PAID,
        orderId: input.orderId,
        receivedAt: input.paidAt,
      },
    });
    await client.databaseJob.updateMany({
      where: {
        idempotencyKey: {
          in: [
            `expire-checkout:${input.checkoutSessionId}`,
            `recover-payment:${input.paymentAttemptId}`,
          ],
        },
        status: { in: [DatabaseJobStatus.PENDING, DatabaseJobStatus.LEASED] },
      },
      data: {
        status: DatabaseJobStatus.COMPLETED,
        completedAt: input.paidAt,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    for (const type of ['PaymentConfirmed', 'OrderCreated']) {
      await client.businessEvent.create({
        data: {
          type,
          actorId: 'payment:fake',
          entityType: type === 'OrderCreated' ? 'Order' : 'PaymentAttempt',
          entityId: type === 'OrderCreated' ? input.orderId : input.paymentAttemptId,
          correlationId: input.correlationId,
          payload: { orderNumber: input.orderNumber },
        },
      });
    }
    await client.orderTimelineEvent.create({
      data: {
        orderId: input.orderId,
        type: 'created',
        toStatus: 'PAID',
        actorId: 'payment:fake',
        reason: 'Verified payment created the commercial Order.',
        correlationId: input.correlationId,
        idempotencyKey: `order-created:${input.orderId}`,
        createdAt: input.paidAt,
      },
    });
    return {
      status: 'paid',
      paymentAttemptId: input.paymentAttemptId,
      orderNumber: input.orderNumber,
    };
  }

  async createReconciliation(input: {
    checkout: CheckoutSessionRecord;
    paymentAttempt: PaymentAttemptRecord;
    callback: import('../domain/checkout.types.js').VerifiedPaymentCallback;
    reason: string;
    now: Date;
    correlationId: string;
  }): Promise<PaymentCallbackOutcome> {
    const client = this.transactions.client();
    await client.paymentAttempt.update({
      where: { id: input.paymentAttempt.id },
      data: {
        status: PaymentAttemptStatus.RECONCILIATION,
        providerTransactionId: input.callback.providerTransactionId,
        verifiedAt: input.now,
        failureCode: input.reason,
      },
    });
    await client.checkoutSession.update({
      where: { id: input.checkout.id },
      data: { status: CheckoutStatus.RECONCILIATION },
    });
    await client.paymentReconciliation.upsert({
      where: {
        provider_providerTransactionId: {
          provider: input.callback.provider,
          providerTransactionId: input.callback.providerTransactionId,
        },
      },
      create: {
        checkoutSessionId: input.checkout.id,
        paymentAttemptId: input.paymentAttempt.id,
        provider: input.callback.provider,
        providerTransactionId: input.callback.providerTransactionId,
        verifiedAmountRial: input.callback.amountRial,
        currency: input.callback.currency,
        reason: input.reason,
      },
      update: {},
    });
    await client.paymentCallbackReceipt.create({
      data: {
        paymentAttemptId: input.paymentAttempt.id,
        provider: input.callback.provider,
        providerEventId: input.callback.nonce,
        providerTransactionId: input.callback.providerTransactionId,
        payloadHash: input.callback.payloadHash,
        result: PaymentCallbackResult.RECONCILIATION,
        receivedAt: input.now,
      },
    });
    await client.databaseJob.upsert({
      where: {
        idempotencyKey: `reconcile:${input.callback.provider}:${input.callback.providerTransactionId}`,
      },
      create: {
        type: DatabaseJobType.RECOVER_PAYMENT,
        idempotencyKey: `reconcile:${input.callback.provider}:${input.callback.providerTransactionId}`,
        payload: { paymentAttemptId: input.paymentAttempt.id },
        runAt: new Date(input.now.getTime() + 60_000),
      },
      update: {},
    });
    await client.businessEvent.create({
      data: {
        type: 'PaymentReconciliationRequired',
        actorId: 'payment:fake',
        entityType: 'PaymentAttempt',
        entityId: input.paymentAttempt.id,
        correlationId: input.correlationId,
        payload: { reason: input.reason },
      },
    });
    return {
      status: 'reconciliation',
      paymentAttemptId: input.paymentAttempt.id,
      orderNumber: null,
    };
  }

  async listOwnedOrders(customerId: string): Promise<OrderSnapshotRecord[]> {
    const orders = await this.transactions.client().order.findMany({
      where: { customerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      include: orderInclude,
    });
    return orders.map(mapOrder);
  }

  async getOwnedOrder(customerId: string, orderNumber: string): Promise<OrderSnapshotRecord> {
    const order = await this.transactions.client().order.findFirst({
      where: { customerId, orderNumber },
      include: orderInclude,
    });
    if (order === null) {
      throw new ApplicationError('not_found', 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    return mapOrder(order);
  }

  async claimJobs(
    workerId: string,
    now: Date,
    leaseUntil: Date,
    limit: number,
  ): Promise<DatabaseJobRecord[]> {
    const client = this.transactions.client();
    const candidates = await client.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM "database_jobs"
        WHERE (
          (status = 'PENDING' AND run_at <= ${now})
          OR (status = 'LEASED' AND lease_expires_at <= ${now})
        )
        AND attempt_count < max_attempts
        ORDER BY run_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}`,
    );
    const claimed: DatabaseJobRecord[] = [];
    for (const candidate of candidates) {
      const job = await client.databaseJob.update({
        where: { id: candidate.id },
        data: {
          status: DatabaseJobStatus.LEASED,
          leaseOwner: workerId,
          leaseExpiresAt: leaseUntil,
          attemptCount: { increment: 1 },
        },
      });
      const payload = job.payload;
      if (payload === null || Array.isArray(payload) || typeof payload !== 'object') {
        throw new Error('Database job payload must be an object.');
      }
      claimed.push({
        id: job.id,
        type: job.type === DatabaseJobType.EXPIRE_CHECKOUT ? 'expire_checkout' : 'recover_payment',
        payload,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        leaseOwner: workerId,
      });
    }
    return claimed;
  }

  async completeJob(jobId: string, workerId: string, now: Date): Promise<void> {
    await this.transactions.client().databaseJob.updateMany({
      where: { id: jobId, status: DatabaseJobStatus.LEASED, leaseOwner: workerId },
      data: {
        status: DatabaseJobStatus.COMPLETED,
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: null,
        lastErrorCode: null,
      },
    });
  }

  async retryJob(input: {
    job: DatabaseJobRecord;
    workerId: string;
    now: Date;
    nextRunAt: Date;
    errorCode: string;
    safeError: string;
  }): Promise<void> {
    const terminal = input.job.attemptCount >= input.job.maxAttempts;
    await this.transactions.client().databaseJob.updateMany({
      where: {
        id: input.job.id,
        status: DatabaseJobStatus.LEASED,
        leaseOwner: input.workerId,
      },
      data: {
        status: terminal ? DatabaseJobStatus.FAILED : DatabaseJobStatus.PENDING,
        runAt: input.nextRunAt,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: input.errorCode,
        lastError: input.safeError,
        ...(terminal ? { completedAt: input.now } : {}),
      },
    });
  }

  private async requireCheckout(id: string): Promise<CheckoutSessionRecord> {
    const row = await this.transactions.client().checkoutSession.findUnique({
      where: { id },
      include: checkoutInclude,
    });
    if (row === null) throw new Error('Created CheckoutSession was not found.');
    return mapCheckout(row);
  }

  private async requirePayment(id: string): Promise<PaymentAttemptRecord> {
    const row = await this.transactions.client().paymentAttempt.findUnique({
      where: { id },
      include: paymentInclude,
    });
    if (row === null) throw new Error('Created PaymentAttempt was not found.');
    return mapPayment(row);
  }
}
