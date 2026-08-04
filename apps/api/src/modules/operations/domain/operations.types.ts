import type { ActorContext } from '../../catalog/domain/catalog.types.js';
import type { FulfillmentStatus } from './order-state-machine.js';

export type OperationsActor = ActorContext;

export type TrackingInput = Readonly<{
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
}>;

export type ReturnSubmission = Readonly<{
  orderNumber: string;
  items: readonly Readonly<{ orderItemId: string; quantity: number }>[];
  reason: string;
  unused: boolean;
  unwashed: boolean;
  tagsAttached: boolean;
}>;

export type RefundRecord = Readonly<{
  id: string;
  orderNumber: string;
  amountRial: number;
  provider: 'fake';
  providerReference: string | null;
  providerTransactionId: string;
  status: 'pending_provider' | 'confirmed' | 'failed';
  requestedAt: Date;
  confirmedAt: Date | null;
  failureCode: string | null;
  providerIdempotencyKey: string;
}>;

export type ReturnRecord = Readonly<{
  id: string;
  orderNumber: string;
  items: readonly Readonly<{ orderItemId: string; quantity: number }>[];
  reason: string;
  unused: true;
  unwashed: true;
  tagsAttached: true;
  status: 'submitted' | 'approved' | 'rejected' | 'refund_pending' | 'completed';
  requestedAt: Date;
  deliveryConfirmedAt: Date;
  eligibilityDeadline: Date;
  decidedAt: Date | null;
  decisionReason: string | null;
  refund: RefundRecord | null;
}>;

export type OperationalOrderRecord = Readonly<{
  id: string;
  customerId: string;
  orderNumber: string;
  version: number;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date;
  paidAt: Date;
  deliveredAt: Date | null;
  paidTotalRial: number;
  itemsSubtotalRial: number;
  shippingTotalRial: number;
  providerTransactionId: string;
  items: readonly Readonly<{
    id: string;
    kind: 'product' | 'outfit';
    title: string;
    selection: string;
    skuCode: string | null;
    outfitRevisionId: string | null;
    outfitRevisionNumber: number | null;
    outfitSize: string | null;
    quantity: number;
    unitPriceRial: number;
    lineTotalRial: number;
    inventoryComponents: readonly Readonly<{ skuId: string; quantity: number }>[];
    outfitComponents: readonly Readonly<{
      outfitItemId: string;
      skuId: string;
      skuCode: string;
      productName: string;
      colorName: string;
      sizeLabel: string;
      quantityPerOutfit: number;
      totalQuantity: number;
      displayOrder: number;
    }>[];
  }>[];
  address: Readonly<Record<string, unknown>>;
  shipping: Readonly<{
    method: 'iran_post' | 'tipax' | 'tehran_local_courier';
    name: string;
    chargedPriceRial: number;
    fixedPriceRial: number;
    freeShippingApplied: boolean;
    freeShippingThresholdRial: number | null;
    settingsVersion: number;
  }>;
  tracking: Readonly<{
    id: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string | null;
    recordedAt: Date;
  }> | null;
  timeline: readonly Readonly<{
    id: string;
    type:
      | 'created'
      | 'fulfillment_transition'
      | 'tracking_updated'
      | 'return_submitted'
      | 'return_decided'
      | 'refund_updated';
    fromStatus: FulfillmentStatus | null;
    toStatus: FulfillmentStatus | null;
    actorId: string;
    reason: string | null;
    occurredAt: Date;
  }>[];
  returns: readonly ReturnRecord[];
  refunds: readonly RefundRecord[];
}>;

export type BulkFilters = Readonly<{
  skuIds: readonly string[];
  productIds: readonly string[];
  categoryIds: readonly string[];
  statuses: readonly ('draft' | 'published' | 'archived')[];
  sizes: readonly string[];
}>;

export type BulkOperationRecord = Readonly<{
  id: string;
  kind: 'price' | 'inventory';
  status: 'previewed' | 'applied' | 'partial_failed' | 'failed';
  reason: string;
  version: number;
  expiresAt: Date;
  createdAt: Date;
  appliedAt: Date | null;
  items: readonly Readonly<{
    skuId: string;
    skuCode: string;
    beforeValue: number;
    proposedValue: number;
    expectedVersion: number;
    status: 'valid' | 'applied' | 'failed';
    failureCode: string | null;
  }>[];
}>;

export type AuditQuery = Readonly<{
  from: Date | null;
  to: Date | null;
  eventType: string | null;
  actor: string | null;
  entityType: string | null;
  entityId: string | null;
  search: string | null;
  limit: number;
}>;
