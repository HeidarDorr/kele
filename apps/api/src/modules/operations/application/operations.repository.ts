import type { RefundProviderResult } from '../../foundation/application/refund-gateway.port.js';
import type { FulfillmentStatus } from '../domain/order-state-machine.js';
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

export const OPERATIONS_REPOSITORY = Symbol('OPERATIONS_REPOSITORY');

export interface OperationsRepository {
  listOrders(query: {
    status: FulfillmentStatus | null;
    search: string | null;
  }): Promise<OperationalOrderRecord[]>;
  getAdminOrder(orderNumber: string): Promise<OperationalOrderRecord>;
  getOwnedOrder(customerId: string, orderNumber: string): Promise<OperationalOrderRecord>;
  listOwnedOrders(customerId: string): Promise<OperationalOrderRecord[]>;
  transitionOrder(input: {
    orderNumber: string;
    expectedVersion: number;
    toStatus: Exclude<FulfillmentStatus, 'cancelled' | 'returned'>;
    reason: string;
    tracking: TrackingInput | null;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<OperationalOrderRecord>;
  appendTracking(input: {
    orderNumber: string;
    expectedVersion: number;
    tracking: TrackingInput;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<OperationalOrderRecord>;
  prepareCancellation(input: {
    orderNumber: string;
    expectedVersion: number;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord>;
  submitReturn(input: {
    customerId: string;
    submission: ReturnSubmission;
    idempotencyKey: string;
    correlationId: string;
    now: Date;
  }): Promise<ReturnRecord>;
  listOwnedReturns(customerId: string): Promise<ReturnRecord[]>;
  listReturns(status: ReturnRecord['status'] | null): Promise<ReturnRecord[]>;
  getReturn(returnId: string): Promise<ReturnRecord>;
  prepareReturnApproval(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord>;
  rejectReturn(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<ReturnRecord>;
  getRefund(refundId: string): Promise<RefundRecord>;
  recordRefundResult(input: {
    refundId: string;
    result: RefundProviderResult;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<RefundRecord>;
  previewPriceBulk(input: {
    filters: BulkFilters;
    adjustment: Readonly<{
      type: 'fixed_amount' | 'percentage_increase' | 'percentage_decrease';
      value: number;
    }>;
    reason: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord>;
  previewInventoryBulk(input: {
    filters: BulkFilters;
    action: 'production' | 'manual_correction' | 'damaged_goods';
    quantity: number;
    reason: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord>;
  getBulkOperation(id: string): Promise<BulkOperationRecord>;
  applyBulkOperation(input: {
    id: string;
    expectedVersion: number;
    idempotencyKey: string;
    actor: OperationsActor;
    now: Date;
  }): Promise<BulkOperationRecord>;
  listAuditEvents(
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
  >;
}
