import { createHash } from 'node:crypto';
import {
  BulkOperationItemStatus,
  BulkOperationKind,
  BulkOperationStatus,
  CartLineKind,
  InventoryAction,
  OrderFulfillmentStatus,
  Prisma,
  RefundSource,
  RefundStatus,
  ReturnRequestStatus,
} from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { RefundProviderResult } from '../../foundation/application/refund-gateway.port.js';
import type { OperationsRepository } from '../application/operations.repository.js';
import {
  assertFulfillmentTransition,
  type FulfillmentStatus,
} from '../domain/order-state-machine.js';
import type {
  AuditQuery,
  BulkFilters,
  BulkOperationRecord,
  OperationalOrderRecord,
  OperationsActor,
  RefundRecord,
  ReturnRecord,
  ReturnSubmission,
  TrackingInput,
} from '../domain/operations.types.js';

const orderInclude = {
  items: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { outfitComponents: { orderBy: { displayOrder: 'asc' as const } } },
  },
  timeline: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
  trackingRevisions: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }] },
  returnRequests: {
    orderBy: [{ requestedAt: 'desc' as const }, { id: 'desc' as const }],
    include: { items: true, refund: true },
  },
  refunds: { orderBy: [{ requestedAt: 'desc' as const }, { id: 'desc' as const }] },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type RefundRow = OrderRow['refunds'][number];
type ReturnRow = OrderRow['returnRequests'][number];

const returnApprovalInclude = {
  items: { include: { orderItem: { include: { outfitComponents: true } } } },
  refund: true,
  order: true,
} satisfies Prisma.ReturnRequestInclude;
type ReturnApprovalRow = Prisma.ReturnRequestGetPayload<{ include: typeof returnApprovalInclude }>;

const bulkInclude = {
  items: { orderBy: [{ skuCode: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.BulkOperationInclude;
type BulkRow = Prisma.BulkOperationGetPayload<{ include: typeof bulkInclude }>;

const fromFulfillment: Record<OrderFulfillmentStatus, FulfillmentStatus> = {
  PAID: 'paid',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};
const toFulfillment: Record<FulfillmentStatus, OrderFulfillmentStatus> = {
  paid: OrderFulfillmentStatus.PAID,
  preparing: OrderFulfillmentStatus.PREPARING,
  shipped: OrderFulfillmentStatus.SHIPPED,
  delivered: OrderFulfillmentStatus.DELIVERED,
  cancelled: OrderFulfillmentStatus.CANCELLED,
  returned: OrderFulfillmentStatus.RETURNED,
};
const returnStatusMap: Record<ReturnRequestStatus, ReturnRecord['status']> = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REFUND_PENDING: 'refund_pending',
  COMPLETED: 'completed',
};
const refundStatusMap: Record<RefundStatus, RefundRecord['status']> = {
  PENDING_PROVIDER: 'pending_provider',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
};
const bulkStatusMap: Record<BulkOperationStatus, BulkOperationRecord['status']> = {
  PREVIEWED: 'previewed',
  APPLIED: 'applied',
  PARTIAL_FAILED: 'partial_failed',
  FAILED: 'failed',
};
const bulkItemStatusMap: Record<
  BulkOperationItemStatus,
  BulkOperationRecord['items'][number]['status']
> = {
  VALID: 'valid',
  APPLIED: 'applied',
  FAILED: 'failed',
};

function safeInteger(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error('Persisted integer exceeds safe transport range.');
  return number;
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function shippingMethod(
  value: OrderRow['shippingMethodCode'],
): OperationalOrderRecord['shipping']['method'] {
  return value === 'IRAN_POST' ? 'iran_post' : value === 'TIPAX' ? 'tipax' : 'tehran_local_courier';
}

function mapRefund(
  row: RefundRow,
  order: Pick<OrderRow, 'orderNumber' | 'providerTransactionId'>,
): RefundRecord {
  if (row.provider !== 'fake') throw new Error('Unsupported persisted refund provider.');
  return {
    id: row.id,
    orderNumber: order.orderNumber,
    amountRial: safeInteger(row.amountRial),
    provider: 'fake',
    providerReference: row.providerReference,
    providerTransactionId: order.providerTransactionId,
    status: refundStatusMap[row.status],
    requestedAt: row.requestedAt,
    confirmedAt: row.confirmedAt,
    failureCode: row.failureCode,
    providerIdempotencyKey: row.providerIdempotencyKey,
  };
}

function mapReturn(
  row: ReturnRow,
  order: Pick<OrderRow, 'orderNumber' | 'providerTransactionId'>,
): ReturnRecord {
  return {
    id: row.id,
    orderNumber: order.orderNumber,
    items: row.items.map((item) => ({ orderItemId: item.orderItemId, quantity: item.quantity })),
    reason: row.reason,
    unused: true,
    unwashed: true,
    tagsAttached: true,
    status: returnStatusMap[row.status],
    requestedAt: row.requestedAt,
    deliveryConfirmedAt: row.deliveryConfirmedAt,
    eligibilityDeadline: row.eligibilityDeadline,
    decidedAt: row.decidedAt,
    decisionReason: row.decisionReason,
    refund: row.refund === null ? null : mapRefund(row.refund, order),
  };
}

function mapOrder(row: OrderRow): OperationalOrderRecord {
  const tracking = row.trackingRevisions[0] ?? null;
  return {
    id: row.id,
    customerId: row.customerId,
    orderNumber: row.orderNumber,
    version: row.version,
    fulfillmentStatus: fromFulfillment[row.fulfillmentStatus],
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    deliveredAt: row.deliveredAt,
    paidTotalRial: safeInteger(row.paidTotalRial),
    itemsSubtotalRial: safeInteger(row.itemsSubtotalRial),
    shippingTotalRial: safeInteger(row.shippingTotalRial),
    providerTransactionId: row.providerTransactionId,
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
      inventoryComponents:
        item.skuId === null
          ? item.outfitComponents.map((component) => ({
              skuId: component.skuIdSnapshot,
              quantity: component.totalQuantity,
            }))
          : [{ skuId: item.skuId, quantity: item.quantity }],
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
    address: row.addressSnapshot as Readonly<Record<string, unknown>>,
    shipping: {
      method: shippingMethod(row.shippingMethodCode),
      name: row.shippingMethodName,
      chargedPriceRial: safeInteger(row.shippingTotalRial),
      fixedPriceRial: safeInteger(row.shippingFixedPriceRial),
      freeShippingApplied: row.freeShippingApplied,
      freeShippingThresholdRial:
        row.freeShippingThresholdRial === null ? null : safeInteger(row.freeShippingThresholdRial),
      settingsVersion: row.shippingSettingsVersion,
    },
    tracking:
      tracking === null
        ? null
        : {
            id: tracking.id,
            carrier: tracking.carrier,
            trackingNumber: tracking.trackingNumber,
            trackingUrl: tracking.trackingUrl,
            recordedAt: tracking.createdAt,
          },
    timeline: row.timeline.map((event) => ({
      id: event.id,
      type: event.type as OperationalOrderRecord['timeline'][number]['type'],
      fromStatus: event.fromStatus === null ? null : fromFulfillment[event.fromStatus],
      toStatus: event.toStatus === null ? null : fromFulfillment[event.toStatus],
      actorId: event.actorId,
      reason: event.reason,
      occurredAt: event.createdAt,
    })),
    returns: row.returnRequests.map((request) => mapReturn(request, row)),
    refunds: row.refunds.map((refund) => mapRefund(refund, row)),
  };
}

function mapBulk(row: BulkRow): BulkOperationRecord {
  return {
    id: row.id,
    kind: row.kind === BulkOperationKind.PRICE ? 'price' : 'inventory',
    status: bulkStatusMap[row.status],
    reason: row.reason,
    version: row.version,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    appliedAt: row.appliedAt,
    items: row.items.map((item) => ({
      skuId: item.skuId,
      skuCode: item.skuCode,
      beforeValue: safeInteger(item.beforeValue),
      proposedValue: safeInteger(item.proposedValue),
      expectedVersion: item.expectedVersion,
      status: bulkItemStatusMap[item.status],
      failureCode: item.failureCode,
    })),
  };
}

function skuWhere(filters: BulkFilters): Prisma.SkuWhereInput {
  return {
    ...(filters.skuIds.length === 0 ? {} : { id: { in: [...filters.skuIds] } }),
    ...(filters.statuses.length === 0
      ? {}
      : {
          status: {
            in: filters.statuses.map(
              (status) => status.toUpperCase() as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
            ),
          },
        }),
    ...(filters.sizes.length === 0 ? {} : { normalizedSize: { in: [...filters.sizes] } }),
    colorVariant: {
      product: {
        ...(filters.productIds.length === 0 ? {} : { id: { in: [...filters.productIds] } }),
        ...(filters.categoryIds.length === 0
          ? {}
          : { categories: { some: { categoryId: { in: [...filters.categoryIds] } } } }),
      },
    },
  };
}

function requirePreviewTargets(count: number): void {
  if (count === 0) {
    throw new ApplicationError(
      'validation',
      'BULK_OPERATION_EMPTY',
      'Bulk preview matched no SKUs.',
    );
  }
}

export class PrismaOperationsRepository implements OperationsRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async listOrders(query: {
    status: FulfillmentStatus | null;
    search: string | null;
  }): Promise<OperationalOrderRecord[]> {
    const rows = await this.transactions.client().order.findMany({
      where: {
        ...(query.status === null ? {} : { fulfillmentStatus: toFulfillment[query.status] }),
        ...(query.search === null
          ? {}
          : {
              OR: [
                { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
                { providerTransactionId: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      include: orderInclude,
    });
    return rows.map(mapOrder);
  }

  async getAdminOrder(orderNumber: string): Promise<OperationalOrderRecord> {
    return mapOrder(await this.findOrder({ orderNumber }));
  }

  async getOwnedOrder(customerId: string, orderNumber: string): Promise<OperationalOrderRecord> {
    return mapOrder(await this.findOrder({ customerId, orderNumber }));
  }

  async listOwnedOrders(customerId: string): Promise<OperationalOrderRecord[]> {
    const rows = await this.transactions.client().order.findMany({
      where: { customerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      include: orderInclude,
    });
    return rows.map(mapOrder);
  }

  async transitionOrder(input: {
    orderNumber: string;
    expectedVersion: number;
    toStatus: 'paid' | 'preparing' | 'shipped' | 'delivered';
    reason: string;
    tracking: TrackingInput | null;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<OperationalOrderRecord> {
    const client = this.transactions.client();
    const replay = await client.orderTimelineEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay !== null) {
      if (replay.toStatus !== toFulfillment[input.toStatus] || replay.reason !== input.reason) {
        throw new ApplicationError(
          'conflict',
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency key was used for another transition.',
        );
      }
      const replayOrder = await client.order.findUnique({
        where: { id: replay.orderId },
        include: orderInclude,
      });
      if (replayOrder === null) throw new Error('Transition replay is missing its Order.');
      return mapOrder(replayOrder);
    }
    const order = await this.lockOrder(input.orderNumber);
    if (order.version !== input.expectedVersion) {
      throw new ApplicationError('conflict', 'ORDER_VERSION_CONFLICT', 'Order version is stale.');
    }
    const from = fromFulfillment[order.fulfillmentStatus];
    assertFulfillmentTransition(from, input.toStatus);
    if (input.toStatus === 'shipped' && input.tracking === null) {
      throw new ApplicationError(
        'validation',
        'SHIPMENT_TRACKING_REQUIRED',
        'Tracking is required for shipment.',
      );
    }
    if (input.toStatus === 'delivered') {
      const tracking = await client.shipmentTrackingRevision.findFirst({
        where: { orderId: order.id },
      });
      if (tracking === null) {
        throw new ApplicationError(
          'conflict',
          'SHIPMENT_REQUIRED',
          'An Order cannot be delivered without shipment tracking.',
        );
      }
    }
    if (input.tracking !== null) {
      await client.shipmentTrackingRevision.create({
        data: {
          orderId: order.id,
          carrier: input.tracking.carrier,
          trackingNumber: input.tracking.trackingNumber,
          trackingUrl: input.tracking.trackingUrl,
          actorId: input.actor.actorId,
          reason: input.reason,
          correlationId: input.actor.correlationId,
          idempotencyKey: `tracking:${input.idempotencyKey}`,
          createdAt: input.now,
        },
      });
    }
    await client.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: toFulfillment[input.toStatus],
        version: { increment: 1 },
        ...(input.toStatus === 'delivered' ? { deliveredAt: input.now } : {}),
      },
    });
    await client.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: 'fulfillment_transition',
        fromStatus: order.fulfillmentStatus,
        toStatus: toFulfillment[input.toStatus],
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: input.idempotencyKey,
        createdAt: input.now,
      },
    });
    await this.event(
      'OrderFulfillmentTransitioned',
      input.actor,
      'Order',
      order.id,
      { orderNumber: order.orderNumber, from, to: input.toStatus, reason: input.reason },
      input.now,
    );
    return this.getAdminOrder(order.orderNumber);
  }

  async appendTracking(input: {
    orderNumber: string;
    expectedVersion: number;
    tracking: TrackingInput;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<OperationalOrderRecord> {
    const client = this.transactions.client();
    const replay = await client.shipmentTrackingRevision.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay !== null) {
      const replayOrder = await client.order.findUnique({
        where: { id: replay.orderId },
        include: orderInclude,
      });
      if (replayOrder === null) throw new Error('Tracking replay is missing its Order.');
      return mapOrder(replayOrder);
    }
    const order = await this.lockOrder(input.orderNumber);
    if (order.version !== input.expectedVersion) {
      throw new ApplicationError('conflict', 'ORDER_VERSION_CONFLICT', 'Order version is stale.');
    }
    if (
      order.fulfillmentStatus !== OrderFulfillmentStatus.SHIPPED &&
      order.fulfillmentStatus !== OrderFulfillmentStatus.DELIVERED
    ) {
      throw new ApplicationError(
        'conflict',
        'TRACKING_STATUS_INVALID',
        'Tracking can be updated only after shipment.',
      );
    }
    await client.shipmentTrackingRevision.create({
      data: {
        orderId: order.id,
        ...input.tracking,
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: input.idempotencyKey,
        createdAt: input.now,
      },
    });
    await client.order.update({ where: { id: order.id }, data: { version: { increment: 1 } } });
    await client.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: 'tracking_updated',
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: `timeline:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await this.event(
      'ShipmentTrackingUpdated',
      input.actor,
      'Order',
      order.id,
      { orderNumber: order.orderNumber },
      input.now,
    );
    return this.getAdminOrder(order.orderNumber);
  }

  async prepareCancellation(input: {
    orderNumber: string;
    expectedVersion: number;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord> {
    const client = this.transactions.client();
    const order = await this.lockOrder(input.orderNumber);
    const providerKey = `refund:cancellation:${order.id}`;
    const existing = await client.refund.findUnique({
      where: { providerIdempotencyKey: providerKey },
    });
    if (existing !== null) return this.getRefund(existing.id);
    if (order.version !== input.expectedVersion) {
      throw new ApplicationError('conflict', 'ORDER_VERSION_CONFLICT', 'Order version is stale.');
    }
    const from = fromFulfillment[order.fulfillmentStatus];
    assertFulfillmentTransition(from, 'cancelled');
    const refund = await client.refund.create({
      data: {
        orderId: order.id,
        source: RefundSource.CANCELLATION,
        amountRial: order.paidTotalRial,
        provider: order.paymentProvider,
        requestedAt: input.now,
        providerIdempotencyKey: providerKey,
      },
    });
    await client.order.update({ where: { id: order.id }, data: { version: { increment: 1 } } });
    await client.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: 'refund_updated',
        fromStatus: order.fulfillmentStatus,
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: `cancellation-request:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await this.event(
      'OrderCancellationRequested',
      input.actor,
      'Order',
      order.id,
      { orderNumber: order.orderNumber, refundId: refund.id },
      input.now,
    );
    return this.getRefund(refund.id);
  }

  async submitReturn(input: {
    customerId: string;
    submission: ReturnSubmission;
    idempotencyKey: string;
    correlationId: string;
    now: Date;
  }): Promise<ReturnRecord> {
    const client = this.transactions.client();
    const requestHash = hash(input.submission);
    const replay = await client.returnRequest.findUnique({
      where: {
        customerId_idempotencyKey: {
          customerId: input.customerId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: {
        items: true,
        refund: true,
        order: { select: { orderNumber: true, providerTransactionId: true } },
      },
    });
    if (replay !== null) {
      if (replay.requestHash !== requestHash) {
        throw new ApplicationError(
          'conflict',
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency key was used for another return request.',
        );
      }
      return mapReturn(replay, replay.order);
    }
    const order = await this.lockOrder(input.submission.orderNumber);
    if (order.customerId !== input.customerId) {
      throw new ApplicationError('not_found', 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    if (
      order.fulfillmentStatus !== OrderFulfillmentStatus.DELIVERED ||
      order.deliveredAt === null
    ) {
      throw new ApplicationError(
        'conflict',
        'RETURN_ORDER_NOT_DELIVERED',
        'Only delivered Orders are eligible for return.',
      );
    }
    const deadline = new Date(order.deliveredAt.getTime() + 24 * 60 * 60 * 1000);
    if (input.now.getTime() > deadline.getTime()) {
      throw new ApplicationError(
        'conflict',
        'RETURN_WINDOW_EXPIRED',
        'The 24-hour return window has expired.',
      );
    }
    if (!input.submission.unused || !input.submission.unwashed || !input.submission.tagsAttached) {
      throw new ApplicationError(
        'validation',
        'RETURN_CONDITIONS_REQUIRED',
        'All condition declarations are required.',
      );
    }
    const unique = new Set(input.submission.items.map((item) => item.orderItemId));
    if (unique.size !== input.submission.items.length || input.submission.items.length === 0) {
      throw new ApplicationError(
        'validation',
        'RETURN_ITEMS_INVALID',
        'Return items must be non-empty and unique.',
      );
    }
    const orderItems = await client.orderItem.findMany({
      where: { orderId: order.id, id: { in: [...unique] } },
      select: { id: true, quantity: true },
    });
    if (orderItems.length !== unique.size) {
      throw new ApplicationError(
        'not_found',
        'ORDER_ITEM_NOT_FOUND',
        'One or more Order items were not found.',
      );
    }
    const prior = await client.returnItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItemId: { in: [...unique] },
        returnRequest: {
          status: {
            in: [
              ReturnRequestStatus.SUBMITTED,
              ReturnRequestStatus.APPROVED,
              ReturnRequestStatus.REFUND_PENDING,
              ReturnRequestStatus.COMPLETED,
            ],
          },
        },
      },
      _sum: { quantity: true },
    });
    const already = new Map(prior.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));
    for (const requested of input.submission.items) {
      const purchased = orderItems.find((item) => item.id === requested.orderItemId)?.quantity ?? 0;
      if (
        !Number.isInteger(requested.quantity) ||
        requested.quantity < 1 ||
        requested.quantity > purchased - (already.get(requested.orderItemId) ?? 0)
      ) {
        throw new ApplicationError(
          'conflict',
          'RETURN_QUANTITY_EXCEEDED',
          'Return quantity exceeds the remaining fulfilled quantity.',
        );
      }
    }
    const created = await client.returnRequest.create({
      data: {
        orderId: order.id,
        customerId: input.customerId,
        reason: input.submission.reason,
        unused: true,
        unwashed: true,
        tagsAttached: true,
        deliveryConfirmedAt: order.deliveredAt,
        eligibilityDeadline: deadline,
        requestedAt: input.now,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        correlationId: input.correlationId,
        items: { create: input.submission.items.map((item) => ({ ...item })) },
      },
      include: { items: true, refund: true },
    });
    await client.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: 'return_submitted',
        actorId: `customer:${input.customerId}`,
        reason: input.submission.reason,
        correlationId: input.correlationId,
        idempotencyKey: `return-submit:${input.customerId}:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await client.businessEvent.create({
      data: {
        type: 'ReturnRequested',
        actorId: `customer:${input.customerId}`,
        entityType: 'ReturnRequest',
        entityId: created.id,
        correlationId: input.correlationId,
        payload: { orderNumber: order.orderNumber, itemCount: created.items.length },
        createdAt: input.now,
      },
    });
    return mapReturn(created, order);
  }

  async listOwnedReturns(customerId: string): Promise<ReturnRecord[]> {
    const rows = await this.transactions.client().returnRequest.findMany({
      where: { customerId },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      include: {
        items: true,
        refund: true,
        order: { select: { orderNumber: true, providerTransactionId: true } },
      },
    });
    return rows.map((row) => mapReturn(row as unknown as ReturnRow, row.order as OrderRow));
  }

  async listReturns(status: ReturnRecord['status'] | null): Promise<ReturnRecord[]> {
    const reverse = Object.fromEntries(
      Object.entries(returnStatusMap).map(([key, value]) => [value, key]),
    ) as Record<ReturnRecord['status'], ReturnRequestStatus>;
    const rows = await this.transactions.client().returnRequest.findMany({
      where: status === null ? {} : { status: reverse[status] },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: 100,
      include: {
        items: true,
        refund: true,
        order: { select: { orderNumber: true, providerTransactionId: true } },
      },
    });
    return rows.map((row) => mapReturn(row as unknown as ReturnRow, row.order as OrderRow));
  }

  async getReturn(returnId: string): Promise<ReturnRecord> {
    const row = await this.transactions.client().returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: true,
        refund: true,
        order: { select: { orderNumber: true, providerTransactionId: true } },
      },
    });
    if (row === null)
      throw new ApplicationError('not_found', 'RETURN_NOT_FOUND', 'Return request was not found.');
    return mapReturn(row, row.order);
  }

  async prepareReturnApproval(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord> {
    const client = this.transactions.client();
    await client.$queryRaw`SELECT id FROM "return_requests" WHERE id = ${input.returnId}::uuid FOR UPDATE`;
    const request = await client.returnRequest.findUnique({
      where: { id: input.returnId },
      include: returnApprovalInclude,
    });
    if (request === null)
      throw new ApplicationError('not_found', 'RETURN_NOT_FOUND', 'Return request was not found.');
    if (request.refund !== null) return this.getRefund(request.refund.id);
    if (request.status !== ReturnRequestStatus.SUBMITTED) {
      throw new ApplicationError(
        'conflict',
        'RETURN_DECISION_CONFLICT',
        'Return request has already been decided.',
      );
    }
    const amountRial = request.items.reduce(
      (sum, item) => sum + safeInteger(item.orderItem.unitPriceRial) * item.quantity,
      0,
    );
    const providerKey = `refund:return:${request.id}`;
    const refund = await client.refund.create({
      data: {
        orderId: request.orderId,
        returnRequestId: request.id,
        source: RefundSource.RETURN,
        amountRial,
        provider: request.order.paymentProvider,
        requestedAt: input.now,
        providerIdempotencyKey: providerKey,
      },
    });
    await this.restoreReturnInventory(request, input.actor, input.now);
    await client.returnRequest.update({
      where: { id: request.id },
      data: {
        status: ReturnRequestStatus.REFUND_PENDING,
        decisionReason: input.reason,
        decidedAt: input.now,
        decidedBy: input.actor.actorId,
      },
    });
    await client.orderTimelineEvent.create({
      data: {
        orderId: request.orderId,
        type: 'return_decided',
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: `return-approve:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await this.event(
      'ReturnApproved',
      input.actor,
      'ReturnRequest',
      request.id,
      { orderNumber: request.order.orderNumber, refundId: refund.id },
      input.now,
    );
    return this.getRefund(refund.id);
  }

  async rejectReturn(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<ReturnRecord> {
    const client = this.transactions.client();
    const replay = await client.orderTimelineEvent.findUnique({
      where: { idempotencyKey: `return-reject:${input.idempotencyKey}` },
    });
    if (replay !== null) return this.getReturn(input.returnId);
    await client.$queryRaw`SELECT id FROM "return_requests" WHERE id = ${input.returnId}::uuid FOR UPDATE`;
    const request = await client.returnRequest.findUnique({
      where: { id: input.returnId },
      include: { order: true },
    });
    if (request === null)
      throw new ApplicationError('not_found', 'RETURN_NOT_FOUND', 'Return request was not found.');
    if (request.status !== ReturnRequestStatus.SUBMITTED) {
      throw new ApplicationError(
        'conflict',
        'RETURN_DECISION_CONFLICT',
        'Return request has already been decided.',
      );
    }
    await client.returnRequest.update({
      where: { id: request.id },
      data: {
        status: ReturnRequestStatus.REJECTED,
        decisionReason: input.reason,
        decidedAt: input.now,
        decidedBy: input.actor.actorId,
      },
    });
    await client.orderTimelineEvent.create({
      data: {
        orderId: request.orderId,
        type: 'return_decided',
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: `return-reject:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await this.event(
      'ReturnRejected',
      input.actor,
      'ReturnRequest',
      request.id,
      { orderNumber: request.order.orderNumber },
      input.now,
    );
    return this.getReturn(request.id);
  }

  async getRefund(refundId: string): Promise<RefundRecord> {
    const row = await this.transactions.client().refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { orderNumber: true, providerTransactionId: true } } },
    });
    if (row === null)
      throw new ApplicationError('not_found', 'REFUND_NOT_FOUND', 'Refund was not found.');
    return mapRefund(row, row.order);
  }

  async recordRefundResult(input: {
    refundId: string;
    result: RefundProviderResult;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord> {
    const client = this.transactions.client();
    const replay = await client.refundAttempt.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay !== null) return this.getRefund(replay.refundId);
    await client.$queryRaw`SELECT id FROM "refunds" WHERE id = ${input.refundId}::uuid FOR UPDATE`;
    const refund = await client.refund.findUnique({
      where: { id: input.refundId },
      include: { order: { include: orderInclude }, returnRequest: true },
    });
    if (refund === null)
      throw new ApplicationError('not_found', 'REFUND_NOT_FOUND', 'Refund was not found.');
    if (refund.status === RefundStatus.CONFIRMED) {
      throw new ApplicationError(
        'conflict',
        'REFUND_ALREADY_CONFIRMED',
        'Refund is already confirmed.',
      );
    }
    const status =
      input.result.status === 'confirmed'
        ? RefundStatus.CONFIRMED
        : input.result.status === 'pending'
          ? RefundStatus.PENDING_PROVIDER
          : RefundStatus.FAILED;
    await client.refundAttempt.create({
      data: {
        refundId: refund.id,
        provider: input.result.provider,
        providerReference: input.result.providerReference || null,
        status,
        failureCode: input.result.failureCode,
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: input.idempotencyKey,
        createdAt: input.now,
      },
    });
    await client.refund.update({
      where: { id: refund.id },
      data: {
        status,
        providerReference: input.result.providerReference || null,
        failureCode: input.result.failureCode,
        confirmedAt:
          status === RefundStatus.CONFIRMED ? (input.result.confirmedAt ?? input.now) : null,
      },
    });
    if (status === RefundStatus.CONFIRMED) {
      if (refund.source === RefundSource.CANCELLATION) {
        await this.restoreWholeOrderInventory(refund.order, input.actor, refund.id, input.now);
        const from = refund.order.fulfillmentStatus;
        await client.order.update({
          where: { id: refund.orderId },
          data: { fulfillmentStatus: OrderFulfillmentStatus.CANCELLED, version: { increment: 1 } },
        });
        await client.orderTimelineEvent.create({
          data: {
            orderId: refund.orderId,
            type: 'fulfillment_transition',
            fromStatus: from,
            toStatus: OrderFulfillmentStatus.CANCELLED,
            actorId: input.actor.actorId,
            reason: input.reason,
            correlationId: input.actor.correlationId,
            idempotencyKey: `cancellation-confirmed:${refund.id}`,
            createdAt: input.now,
          },
        });
      } else if (refund.returnRequestId !== null) {
        await client.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: { status: ReturnRequestStatus.COMPLETED },
        });
        if (await this.isWholeOrderReturned(refund.orderId)) {
          await client.order.update({
            where: { id: refund.orderId },
            data: { fulfillmentStatus: OrderFulfillmentStatus.RETURNED, version: { increment: 1 } },
          });
          await client.orderTimelineEvent.create({
            data: {
              orderId: refund.orderId,
              type: 'fulfillment_transition',
              fromStatus: OrderFulfillmentStatus.DELIVERED,
              toStatus: OrderFulfillmentStatus.RETURNED,
              actorId: input.actor.actorId,
              reason: input.reason,
              correlationId: input.actor.correlationId,
              idempotencyKey: `return-completed:${refund.returnRequestId}`,
              createdAt: input.now,
            },
          });
        }
      }
    }
    await client.orderTimelineEvent.create({
      data: {
        orderId: refund.orderId,
        type: 'refund_updated',
        actorId: input.actor.actorId,
        reason: input.reason,
        correlationId: input.actor.correlationId,
        idempotencyKey: `refund-result:${input.idempotencyKey}`,
        createdAt: input.now,
      },
    });
    await this.event(
      'RefundStatusChanged',
      input.actor,
      'Refund',
      refund.id,
      { status: input.result.status, orderNumber: refund.order.orderNumber },
      input.now,
    );
    return this.getRefund(refund.id);
  }

  async previewPriceBulk(input: {
    filters: BulkFilters;
    adjustment: Readonly<{
      type: 'fixed_amount' | 'percentage_increase' | 'percentage_decrease';
      value: number;
    }>;
    reason: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord> {
    if (!Number.isSafeInteger(input.adjustment.value) || input.adjustment.value < 1) {
      throw new ApplicationError(
        'validation',
        'BULK_ADJUSTMENT_INVALID',
        'Price adjustment must be a positive integer.',
      );
    }
    const client = this.transactions.client();
    const skus = await client.sku.findMany({
      where: { ...skuWhere(input.filters), currentPrice: { isNot: null } },
      orderBy: { id: 'asc' },
      take: 500,
      select: {
        id: true,
        code: true,
        currentPrice: { select: { amountRial: true, version: true } },
      },
    });
    requirePreviewTargets(skus.length);
    const items = skus.map((sku) => {
      if (sku.currentPrice === null) throw new Error('Price preview selected an unpriced SKU.');
      const before = safeInteger(sku.currentPrice.amountRial);
      const proposed =
        input.adjustment.type === 'fixed_amount'
          ? input.adjustment.value
          : Math.round(
              before *
                (input.adjustment.type === 'percentage_increase'
                  ? (100 + input.adjustment.value) / 100
                  : (100 - input.adjustment.value) / 100),
            );
      if (!Number.isSafeInteger(proposed) || proposed <= 0) {
        throw new ApplicationError(
          'validation',
          'BULK_PRICE_INVALID',
          'Bulk adjustment would create a non-positive or unsafe price.',
        );
      }
      return {
        skuId: sku.id,
        skuCode: sku.code,
        beforeValue: before,
        proposedValue: proposed,
        expectedVersion: sku.currentPrice.version,
      };
    });
    const row = await client.bulkOperation.create({
      data: {
        kind: BulkOperationKind.PRICE,
        reason: input.reason,
        filters: input.filters,
        operation: input.adjustment,
        actorId: input.actor.actorId,
        correlationId: input.actor.correlationId,
        expiresAt: new Date(input.now.getTime() + 30 * 60_000),
        requestHash: hash({
          filters: input.filters,
          adjustment: input.adjustment,
          reason: input.reason,
        }),
        createdAt: input.now,
        items: { create: items },
      },
      include: bulkInclude,
    });
    await this.event(
      'BulkPricePreviewed',
      input.actor,
      'BulkOperation',
      row.id,
      { targetCount: items.length },
      input.now,
    );
    return mapBulk(row);
  }

  async previewInventoryBulk(input: {
    filters: BulkFilters;
    action: 'production' | 'manual_correction' | 'damaged_goods';
    quantity: number;
    reason: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord> {
    if (!Number.isSafeInteger(input.quantity) || input.quantity === 0) {
      throw new ApplicationError(
        'validation',
        'BULK_QUANTITY_INVALID',
        'Inventory quantity must be a non-zero integer.',
      );
    }
    const client = this.transactions.client();
    const skus = await client.sku.findMany({
      where: { ...skuWhere(input.filters), inventory: { isNot: null } },
      orderBy: { id: 'asc' },
      take: 500,
      select: { id: true, code: true, inventory: true },
    });
    requirePreviewTargets(skus.length);
    const items = skus.map((sku) => {
      if (sku.inventory === null) throw new Error('Inventory preview selected an unstocked SKU.');
      const delta =
        input.action === 'production'
          ? Math.abs(input.quantity)
          : input.action === 'damaged_goods'
            ? -Math.abs(input.quantity)
            : input.quantity;
      const proposed = sku.inventory.physicalQuantity + delta;
      if (proposed < sku.inventory.reservedQuantity || proposed < 0) {
        throw new ApplicationError(
          'validation',
          'BULK_INVENTORY_INVALID',
          'Bulk adjustment would make stock negative or below reserved quantity.',
        );
      }
      return {
        skuId: sku.id,
        skuCode: sku.code,
        beforeValue: sku.inventory.physicalQuantity,
        proposedValue: proposed,
        expectedVersion: sku.inventory.version,
      };
    });
    const operation = { action: input.action, quantity: input.quantity };
    const row = await client.bulkOperation.create({
      data: {
        kind: BulkOperationKind.INVENTORY,
        reason: input.reason,
        filters: input.filters,
        operation,
        actorId: input.actor.actorId,
        correlationId: input.actor.correlationId,
        expiresAt: new Date(input.now.getTime() + 30 * 60_000),
        requestHash: hash({ filters: input.filters, operation, reason: input.reason }),
        createdAt: input.now,
        items: { create: items },
      },
      include: bulkInclude,
    });
    await this.event(
      'BulkInventoryPreviewed',
      input.actor,
      'BulkOperation',
      row.id,
      { targetCount: items.length },
      input.now,
    );
    return mapBulk(row);
  }

  async getBulkOperation(id: string): Promise<BulkOperationRecord> {
    const row = await this.transactions
      .client()
      .bulkOperation.findUnique({ where: { id }, include: bulkInclude });
    if (row === null)
      throw new ApplicationError(
        'not_found',
        'BULK_OPERATION_NOT_FOUND',
        'Bulk operation was not found.',
      );
    return mapBulk(row);
  }

  async applyBulkOperation(input: {
    id: string;
    expectedVersion: number;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord> {
    const client = this.transactions.client();
    await client.$queryRaw`SELECT id FROM "bulk_operations" WHERE id = ${input.id}::uuid FOR UPDATE`;
    const operation = await client.bulkOperation.findUnique({
      where: { id: input.id },
      include: bulkInclude,
    });
    if (operation === null)
      throw new ApplicationError(
        'not_found',
        'BULK_OPERATION_NOT_FOUND',
        'Bulk operation was not found.',
      );
    if (operation.applyIdempotencyKey !== null) {
      if (operation.applyIdempotencyKey !== input.idempotencyKey) {
        throw new ApplicationError(
          'conflict',
          'BULK_OPERATION_ALREADY_APPLIED',
          'Bulk operation was already applied.',
        );
      }
      return mapBulk(operation);
    }
    if (
      operation.status !== BulkOperationStatus.PREVIEWED ||
      operation.version !== input.expectedVersion
    ) {
      throw new ApplicationError(
        'conflict',
        'BULK_OPERATION_STALE',
        'Bulk preview version is stale.',
      );
    }
    if (input.now.getTime() > operation.expiresAt.getTime()) {
      throw new ApplicationError('conflict', 'BULK_OPERATION_EXPIRED', 'Bulk preview has expired.');
    }
    let succeeded = 0;
    let failed = 0;
    const inventoryOperation = operation.operation as { action?: string; quantity?: number };
    for (const item of operation.items) {
      if (operation.kind === BulkOperationKind.PRICE) {
        const current = await client.currentSkuPrice.findUnique({ where: { skuId: item.skuId } });
        if (
          current === null ||
          current.version !== item.expectedVersion ||
          current.amountRial !== item.beforeValue
        ) {
          failed += 1;
          await client.bulkOperationItem.update({
            where: { id: item.id },
            data: { status: BulkOperationItemStatus.FAILED, failureCode: 'STALE_PRICE_VERSION' },
          });
          continue;
        }
        const record = await client.priceRecord.create({
          data: {
            skuId: item.skuId,
            amountRial: item.proposedValue,
            actorId: input.actor.actorId,
            reason: operation.reason,
            validFrom: input.now,
          },
        });
        const updated = await client.currentSkuPrice.updateMany({
          where: { skuId: item.skuId, version: item.expectedVersion },
          data: {
            priceRecordId: record.id,
            amountRial: item.proposedValue,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error('Locked price projection changed unexpectedly.');
        await client.bulkOperationItem.update({
          where: { id: item.id },
          data: { status: BulkOperationItemStatus.APPLIED },
        });
        await this.event(
          'BulkPriceUpdated',
          input.actor,
          'Sku',
          item.skuId,
          {
            beforeRial: safeInteger(item.beforeValue),
            afterRial: safeInteger(item.proposedValue),
            bulkOperationId: operation.id,
          },
          input.now,
        );
        succeeded += 1;
      } else {
        const current = await client.inventory.findUnique({ where: { skuId: item.skuId } });
        if (
          current === null ||
          current.version !== item.expectedVersion ||
          BigInt(current.physicalQuantity) !== item.beforeValue ||
          safeInteger(item.proposedValue) < current.reservedQuantity
        ) {
          failed += 1;
          await client.bulkOperationItem.update({
            where: { id: item.id },
            data: {
              status: BulkOperationItemStatus.FAILED,
              failureCode: 'STALE_INVENTORY_VERSION',
            },
          });
          continue;
        }
        const proposed = safeInteger(item.proposedValue);
        const updated = await client.inventory.updateMany({
          where: { skuId: item.skuId, version: item.expectedVersion },
          data: { physicalQuantity: proposed, version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new Error('Locked inventory projection changed unexpectedly.');
        const action =
          inventoryOperation.action === 'production'
            ? InventoryAction.PRODUCTION
            : inventoryOperation.action === 'damaged_goods'
              ? InventoryAction.DAMAGED_GOODS
              : InventoryAction.MANUAL_CORRECTION;
        await client.inventoryMovement.create({
          data: {
            skuId: item.skuId,
            action,
            quantityDelta: proposed - current.physicalQuantity,
            beforePhysicalQuantity: current.physicalQuantity,
            afterPhysicalQuantity: proposed,
            beforeReservedQuantity: current.reservedQuantity,
            afterReservedQuantity: current.reservedQuantity,
            actorId: input.actor.actorId,
            reason: operation.reason,
            correlationId: input.actor.correlationId,
            idempotencyKey: `bulk:${operation.id}:${item.skuId}`,
          },
        });
        await client.bulkOperationItem.update({
          where: { id: item.id },
          data: { status: BulkOperationItemStatus.APPLIED },
        });
        await this.event(
          'BulkInventoryUpdated',
          input.actor,
          'Sku',
          item.skuId,
          { before: current.physicalQuantity, after: proposed, bulkOperationId: operation.id },
          input.now,
        );
        succeeded += 1;
      }
    }
    const status =
      failed === 0
        ? BulkOperationStatus.APPLIED
        : succeeded === 0
          ? BulkOperationStatus.FAILED
          : BulkOperationStatus.PARTIAL_FAILED;
    const row = await client.bulkOperation.update({
      where: { id: operation.id },
      data: {
        status,
        version: { increment: 1 },
        appliedAt: input.now,
        applyIdempotencyKey: input.idempotencyKey,
      },
      include: bulkInclude,
    });
    await this.event(
      operation.kind === BulkOperationKind.PRICE ? 'BulkPriceApplied' : 'BulkInventoryApplied',
      input.actor,
      'BulkOperation',
      operation.id,
      { succeeded, failed, status: bulkStatusMap[status] },
      input.now,
    );
    return mapBulk(row);
  }

  async listAuditEvents(
    query: AuditQuery,
    actor: OperationsActor,
  ): Promise<
    readonly Readonly<{
      id: string;
      eventType: string;
      actorId: string;
      entityType: string;
      entityId: string;
      correlationId: string;
      payload: Readonly<Record<string, unknown>>;
      occurredAt: Date;
    }>[]
  > {
    if (query.search !== null) {
      const conditions: Prisma.Sql[] = [
        Prisma.sql`(
          "type" ILIKE ${`%${query.search}%`}
          OR "actor_id" ILIKE ${`%${query.search}%`}
          OR "entity_type" ILIKE ${`%${query.search}%`}
          OR "entity_id" ILIKE ${`%${query.search}%`}
          OR "payload"::text ILIKE ${`%${query.search}%`}
        )`,
      ];
      if (query.from !== null) conditions.push(Prisma.sql`"created_at" >= ${query.from}`);
      if (query.to !== null) conditions.push(Prisma.sql`"created_at" <= ${query.to}`);
      if (query.eventType !== null) conditions.push(Prisma.sql`"type" = ${query.eventType}`);
      if (query.actor !== null) conditions.push(Prisma.sql`"actor_id" = ${query.actor}`);
      if (query.entityType !== null)
        conditions.push(Prisma.sql`"entity_type" = ${query.entityType}`);
      if (query.entityId !== null) conditions.push(Prisma.sql`"entity_id" = ${query.entityId}`);
      if (actor.role === 'instagram_admin')
        conditions.push(Prisma.sql`"actor_id" = ${actor.actorId}`);
      const rows = await this.transactions.client().$queryRaw<
        Array<{
          id: string;
          type: string;
          actorId: string;
          entityType: string;
          entityId: string;
          correlationId: string;
          payload: Prisma.JsonValue;
          createdAt: Date;
        }>
      >(Prisma.sql`
        SELECT
          "id", "type", "actor_id" AS "actorId", "entity_type" AS "entityType",
          "entity_id" AS "entityId", "correlation_id" AS "correlationId",
          "payload", "created_at" AS "createdAt"
        FROM "business_events"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY "created_at" DESC, "id" DESC
        LIMIT ${query.limit}
      `);
      return rows.map((row) => ({
        id: row.id,
        eventType: row.type,
        actorId: row.actorId,
        entityType: row.entityType,
        entityId: row.entityId,
        correlationId: row.correlationId,
        payload: row.payload as Readonly<Record<string, unknown>>,
        occurredAt: row.createdAt,
      }));
    }
    const where: Prisma.BusinessEventWhereInput = {
      ...(query.from === null && query.to === null
        ? {}
        : {
            createdAt: {
              ...(query.from === null ? {} : { gte: query.from }),
              ...(query.to === null ? {} : { lte: query.to }),
            },
          }),
      ...(query.eventType === null ? {} : { type: query.eventType }),
      ...(query.actor === null ? {} : { actorId: query.actor }),
      ...(query.entityType === null ? {} : { entityType: query.entityType }),
      ...(query.entityId === null ? {} : { entityId: query.entityId }),
      ...(actor.role === 'instagram_admin' ? { actorId: actor.actorId } : {}),
    };
    const rows = await this.transactions.client().businessEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
    });
    return rows.map((row) => ({
      id: row.id,
      eventType: row.type,
      actorId: row.actorId,
      entityType: row.entityType,
      entityId: row.entityId,
      correlationId: row.correlationId,
      payload: row.payload as Readonly<Record<string, unknown>>,
      occurredAt: row.createdAt,
    }));
  }

  private async findOrder(where: Prisma.OrderWhereInput): Promise<OrderRow> {
    const row = await this.transactions.client().order.findFirst({ where, include: orderInclude });
    if (row === null)
      throw new ApplicationError('not_found', 'ORDER_NOT_FOUND', 'Order was not found.');
    return row;
  }

  private async lockOrder(orderNumber: string) {
    const rows = await this.transactions.client().$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "orders" WHERE "order_number" = ${orderNumber} FOR UPDATE
    `;
    if (rows.length === 0)
      throw new ApplicationError('not_found', 'ORDER_NOT_FOUND', 'Order was not found.');
    const locked = rows[0];
    if (locked === undefined) throw new Error('Locked Order row was unavailable.');
    const order = await this.transactions.client().order.findUnique({ where: { id: locked.id } });
    if (order === null) throw new Error('Locked Order disappeared.');
    return order;
  }

  private async event(
    type: string,
    actor: OperationsActor,
    entityType: string,
    entityId: string,
    payload: Prisma.InputJsonObject,
    now: Date,
  ): Promise<void> {
    await this.transactions.client().businessEvent.create({
      data: {
        type,
        actorId: actor.actorId,
        entityType,
        entityId,
        correlationId: actor.correlationId,
        payload,
        createdAt: now,
      },
    });
  }

  private async restoreReturnInventory(
    request: ReturnApprovalRow,
    actor: OperationsActor,
    now: Date,
  ): Promise<void> {
    const quantities = new Map<string, number>();
    for (const item of request.items) {
      if (item.orderItem.skuId !== null) {
        quantities.set(
          item.orderItem.skuId,
          (quantities.get(item.orderItem.skuId) ?? 0) + item.quantity,
        );
      } else {
        for (const component of item.orderItem.outfitComponents) {
          const quantity = component.quantityPerOutfit * item.quantity;
          quantities.set(
            component.skuIdSnapshot,
            (quantities.get(component.skuIdSnapshot) ?? 0) + quantity,
          );
        }
      }
    }
    await this.restoreInventory(
      request.orderId,
      request.id,
      quantities,
      InventoryAction.CUSTOMER_RETURN,
      actor,
      now,
    );
  }

  private async restoreWholeOrderInventory(
    order: OrderRow,
    actor: OperationsActor,
    refundId: string,
    now: Date,
  ): Promise<void> {
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      if (item.skuId !== null) {
        quantities.set(item.skuId, (quantities.get(item.skuId) ?? 0) + item.quantity);
      } else {
        for (const component of item.outfitComponents) {
          quantities.set(
            component.skuIdSnapshot,
            (quantities.get(component.skuIdSnapshot) ?? 0) + component.totalQuantity,
          );
        }
      }
    }
    await this.restoreInventory(
      order.id,
      null,
      quantities,
      InventoryAction.ORDER_CANCELLATION,
      actor,
      now,
      refundId,
    );
  }

  private async restoreInventory(
    orderId: string,
    returnRequestId: string | null,
    quantities: ReadonlyMap<string, number>,
    action: InventoryAction,
    actor: OperationsActor,
    now: Date,
    scopeId: string = returnRequestId ?? orderId,
  ): Promise<void> {
    const client = this.transactions.client();
    for (const [skuId, quantity] of [...quantities.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      await client.$queryRaw`SELECT "sku_id" FROM "inventory" WHERE "sku_id" = ${skuId}::uuid FOR UPDATE`;
      const current = await client.inventory.findUnique({ where: { skuId } });
      if (current === null) throw new Error('Return inventory projection is missing.');
      const updated = await client.inventory.update({
        where: { skuId },
        data: { physicalQuantity: { increment: quantity }, version: { increment: 1 } },
      });
      await client.inventoryMovement.create({
        data: {
          skuId,
          action,
          quantityDelta: quantity,
          beforePhysicalQuantity: current.physicalQuantity,
          afterPhysicalQuantity: updated.physicalQuantity,
          beforeReservedQuantity: current.reservedQuantity,
          afterReservedQuantity: updated.reservedQuantity,
          actorId: actor.actorId,
          reason:
            action === InventoryAction.CUSTOMER_RETURN
              ? 'Approved customer return'
              : 'Confirmed Order cancellation',
          correlationId: actor.correlationId,
          idempotencyKey: `${action.toLowerCase()}:${scopeId}:${skuId}`,
          orderId,
          returnRequestId,
          createdAt: now,
        },
      });
    }
  }

  private async isWholeOrderReturned(orderId: string): Promise<boolean> {
    const items = await this.transactions
      .client()
      .orderItem.findMany({ where: { orderId }, select: { id: true, quantity: true } });
    const returned = await this.transactions.client().returnItem.groupBy({
      by: ['orderItemId'],
      where: { orderItem: { orderId }, returnRequest: { status: ReturnRequestStatus.COMPLETED } },
      _sum: { quantity: true },
    });
    const totals = new Map(returned.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));
    return items.length > 0 && items.every((item) => (totals.get(item.id) ?? 0) >= item.quantity);
  }
}
