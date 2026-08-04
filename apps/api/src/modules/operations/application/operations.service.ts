import { createHash } from 'node:crypto';
import { ApplicationError } from '../../../shared/application-error.js';
import { commandFingerprint } from '../../../shared/command-fingerprint.js';
import type { Clock } from '../../../shared/deterministic-runtime.js';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import type { RefundGateway } from '../../foundation/application/refund-gateway.port.js';
import { requiresTracking } from '../domain/order-state-machine.js';
import type {
  AuditQuery,
  BulkFilters,
  OperationsActor,
  ReturnSubmission,
  TrackingInput,
} from '../domain/operations.types.js';
import type { OperationsRepository } from './operations.repository.js';

function requireReason(reason: string): string {
  const value = reason.trim();
  if (value.length < 3 || value.length > 500) {
    throw new ApplicationError(
      'validation',
      'REASON_INVALID',
      'A reason of 3 to 500 characters is required.',
    );
  }
  return value;
}

function providerAttemptKey(refundId: string, commandKey: string): string {
  return createHash('sha256').update(`${refundId}:${commandKey}`).digest('hex');
}

function normalizedReturnItems(items: ReturnSubmission['items']) {
  return [...items].sort((left, right) => left.orderItemId.localeCompare(right.orderItemId));
}

function normalizeTracking(tracking: TrackingInput): TrackingInput {
  const carrier = tracking.carrier.trim();
  const trackingNumber = tracking.trackingNumber.trim();
  const trackingUrl = tracking.trackingUrl?.trim() || null;
  if (
    carrier.length < 2 ||
    carrier.length > 120 ||
    trackingNumber.length < 2 ||
    trackingNumber.length > 160 ||
    (trackingUrl !== null && trackingUrl.length > 1000)
  ) {
    throw new ApplicationError(
      'validation',
      'TRACKING_INVALID',
      'Carrier and tracking number must be non-blank and within contract limits.',
    );
  }
  return { carrier, trackingNumber, trackingUrl };
}

export class OperationsService {
  constructor(
    private readonly repository: OperationsRepository,
    private readonly refunds: RefundGateway,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  listAdminOrders(
    status: Parameters<OperationsRepository['listOrders']>[0]['status'],
    search: string | null,
  ) {
    return this.repository.listOrders({ status, search });
  }

  getAdminOrder(orderNumber: string) {
    return this.repository.getAdminOrder(orderNumber);
  }

  listOwnedOrders(customerId: string) {
    return this.repository.listOwnedOrders(customerId);
  }

  getOwnedOrder(customerId: string, orderNumber: string) {
    return this.repository.getOwnedOrder(customerId, orderNumber);
  }

  async transitionOrder(input: {
    orderNumber: string;
    expectedVersion: number;
    toStatus: 'preparing' | 'shipped' | 'delivered' | 'cancelled';
    reason: string;
    tracking: TrackingInput | null;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const reason = requireReason(input.reason);
    const tracking = input.tracking === null ? null : normalizeTracking(input.tracking);
    if (tracking !== null && input.toStatus !== 'shipped') {
      throw new ApplicationError(
        'validation',
        'TRACKING_TRANSITION_INVALID',
        'Tracking may be supplied only for the Preparing to Shipped transition.',
      );
    }
    if (requiresTracking(input.toStatus) && tracking === null) {
      throw new ApplicationError(
        'validation',
        'SHIPMENT_TRACKING_REQUIRED',
        'Carrier and tracking number are required before shipment.',
      );
    }
    const fingerprint = commandFingerprint({
      commandType: 'operations.order.transition',
      target: { type: 'Order', id: input.orderNumber },
      version: input.expectedVersion,
      payload: { toStatus: input.toStatus, reason, tracking },
    });
    if (input.toStatus !== 'cancelled') {
      const transition = {
        ...input,
        toStatus: input.toStatus,
        reason,
        tracking,
        fingerprint,
        now: this.clock(),
      };
      return this.unitOfWork.run(() => this.repository.transitionOrder(transition));
    }

    const prepared = await this.unitOfWork.run(() =>
      this.repository.prepareCancellation({
        orderNumber: input.orderNumber,
        expectedVersion: input.expectedVersion,
        reason,
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        actor: input.actor,
        now: this.clock(),
      }),
    );
    if (prepared.replayed) return this.repository.getAdminOrder(input.orderNumber);
    const refund = prepared.refund;
    if (refund.status === 'confirmed') return this.repository.getAdminOrder(input.orderNumber);
    await this.executeRefund(refund.id, refund, reason, input.idempotencyKey, input.actor);
    return this.repository.getAdminOrder(input.orderNumber);
  }

  async appendTracking(input: {
    orderNumber: string;
    expectedVersion: number;
    tracking: TrackingInput;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const reason = requireReason(input.reason);
    const tracking = normalizeTracking(input.tracking);
    const fingerprint = commandFingerprint({
      commandType: 'operations.order.tracking',
      target: { type: 'Order', id: input.orderNumber },
      version: input.expectedVersion,
      payload: { tracking, reason },
    });
    return this.unitOfWork.run(() =>
      this.repository.appendTracking({
        ...input,
        tracking,
        reason,
        fingerprint,
        now: this.clock(),
      }),
    );
  }

  submitReturn(
    customerId: string,
    submission: ReturnSubmission,
    idempotencyKey: string,
    correlationId: string,
  ) {
    const normalized = { ...submission, reason: requireReason(submission.reason) };
    const fingerprint = commandFingerprint({
      commandType: 'operations.return.submit',
      target: { type: 'CustomerOrder', id: `${customerId}:${submission.orderNumber}` },
      version: null,
      payload: { ...normalized, items: normalizedReturnItems(normalized.items) },
    });
    return this.unitOfWork.run(() =>
      this.repository.submitReturn({
        customerId,
        submission: normalized,
        idempotencyKey,
        fingerprint,
        correlationId,
        now: this.clock(),
      }),
    );
  }

  listOwnedReturns(customerId: string) {
    return this.repository.listOwnedReturns(customerId);
  }

  listReturns(status: Parameters<OperationsRepository['listReturns']>[0]) {
    return this.repository.listReturns(status);
  }

  async approveReturn(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const reason = requireReason(input.reason);
    const fingerprint = commandFingerprint({
      commandType: 'operations.return.approve',
      target: { type: 'ReturnRequest', id: input.returnId },
      version: null,
      payload: { reason },
    });
    const prepared = await this.unitOfWork.run(() =>
      this.repository.prepareReturnApproval({
        ...input,
        reason,
        fingerprint,
        now: this.clock(),
      }),
    );
    if (prepared.replayed) return this.repository.getReturn(input.returnId);
    const refund = prepared.refund;
    if (refund.status === 'confirmed') return this.repository.getReturn(input.returnId);
    await this.executeRefund(refund.id, refund, reason, input.idempotencyKey, input.actor);
    return this.repository.getReturn(input.returnId);
  }

  rejectReturn(input: {
    returnId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const reason = requireReason(input.reason);
    const fingerprint = commandFingerprint({
      commandType: 'operations.return.reject',
      target: { type: 'ReturnRequest', id: input.returnId },
      version: null,
      payload: { reason },
    });
    return this.unitOfWork.run(() =>
      this.repository.rejectReturn({
        ...input,
        reason,
        fingerprint,
        now: this.clock(),
      }),
    );
  }

  async retryRefund(input: {
    refundId: string;
    reason: string;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const reason = requireReason(input.reason);
    const fingerprint = commandFingerprint({
      commandType: 'operations.refund.retry',
      target: { type: 'Refund', id: input.refundId },
      version: null,
      payload: { reason },
    });
    const prepared = await this.unitOfWork.run(() =>
      this.repository.prepareRefundRetry({
        ...input,
        reason,
        fingerprint,
        now: this.clock(),
      }),
    );
    if (prepared.replayed) return prepared.refund;
    return this.executeRefund(
      input.refundId,
      prepared.refund,
      reason,
      input.idempotencyKey,
      input.actor,
    );
  }

  previewPriceBulk(input: {
    filters: BulkFilters;
    adjustment: Readonly<{
      type: 'fixed_amount' | 'percentage_increase' | 'percentage_decrease';
      value: number;
    }>;
    reason: string;
    actor: OperationsActor;
  }) {
    return this.unitOfWork.run(() =>
      this.repository.previewPriceBulk({
        ...input,
        reason: requireReason(input.reason),
        now: this.clock(),
      }),
    );
  }

  previewInventoryBulk(input: {
    filters: BulkFilters;
    action: 'production' | 'manual_correction' | 'damaged_goods';
    quantity: number;
    reason: string;
    actor: OperationsActor;
  }) {
    return this.unitOfWork.run(() =>
      this.repository.previewInventoryBulk({
        ...input,
        reason: requireReason(input.reason),
        now: this.clock(),
      }),
    );
  }

  async getBulkOperation(id: string, actor: OperationsActor) {
    const operation = await this.repository.getBulkOperation(id);
    if (operation.kind === 'price' && actor.role !== 'super_admin') {
      throw new ApplicationError(
        'forbidden',
        'BULK_OPERATION_FORBIDDEN',
        'Only Super Admin may read price operations.',
      );
    }
    return operation;
  }

  applyBulkOperation(input: {
    id: string;
    expectedVersion: number;
    idempotencyKey: string;
    actor: OperationsActor;
  }) {
    const fingerprint = commandFingerprint({
      commandType: 'operations.bulk.apply',
      target: { type: 'BulkOperation', id: input.id },
      version: input.expectedVersion,
      payload: {},
    });
    return this.unitOfWork.run(() =>
      this.repository.applyBulkOperation({ ...input, fingerprint, now: this.clock() }),
    );
  }

  listAuditEvents(query: AuditQuery, actor: OperationsActor) {
    return this.repository.listAuditEvents(query, actor);
  }

  currentTime(): Date {
    return this.clock();
  }

  private async executeRefund(
    refundId: string,
    refund: Awaited<ReturnType<OperationsRepository['getRefund']>>,
    reason: string,
    commandKey: string,
    actor: OperationsActor,
  ) {
    const attemptKey = providerAttemptKey(refundId, commandKey);
    let result;
    try {
      result = await this.refunds.requestRefund({
        providerTransactionId: refund.providerTransactionId,
        amountRial: refund.amountRial,
        currency: 'IRR',
        idempotencyKey: refund.providerIdempotencyKey,
        correlationId: actor.correlationId,
        requestedAt: this.clock(),
      });
    } catch {
      result = {
        provider: 'fake' as const,
        providerReference: '',
        status: 'failed' as const,
        confirmedAt: null,
        failureCode: 'REFUND_PROVIDER_UNAVAILABLE',
      };
    }
    const saved = await this.unitOfWork.run(() =>
      this.repository.recordRefundResult({
        refundId,
        result,
        reason,
        idempotencyKey: attemptKey,
        actor,
        now: this.clock(),
      }),
    );
    if (saved.status !== 'confirmed') {
      throw new ApplicationError(
        'conflict',
        'REFUND_PROVIDER_NOT_CONFIRMED',
        'Refund remains unconfirmed and may be retried.',
      );
    }
    return saved;
  }
}
