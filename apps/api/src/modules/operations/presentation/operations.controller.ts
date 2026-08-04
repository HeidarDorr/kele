import { randomUUID } from 'node:crypto';
import { formatIrrAsToman } from '@kele/design-system/money';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../../shared/application-error.js';
import { correlationId } from '../../../platform/observability/correlation-context.js';
import {
  actorFromRequest,
  AdminSessionGuard,
  type CatalogAdminRequest,
  RequireAdminRoles,
} from '../../catalog/presentation/admin-session.guard.js';
import {
  CustomerCsrfGuard,
  type CustomerRequest,
  CustomerSessionGuard,
} from '../../identity/presentation/customer-session.guard.js';
import { OperationsService } from '../application/operations.service.js';
import type {
  BulkOperationRecord,
  OperationalOrderRecord,
  RefundRecord,
  ReturnRecord,
} from '../domain/operations.types.js';
import {
  AuditQueryDto,
  DecisionDto,
  InventoryBulkPreviewDto,
  OrdersQueryDto,
  OrderTransitionDto,
  PriceBulkPreviewDto,
  ReturnsQueryDto,
  ReturnSubmissionDto,
  TrackingRevisionDto,
} from './operations.dto.js';

function requireKey(value: string | undefined): string {
  if (value === undefined || value.length < 16 || value.length > 120) {
    throw new ApplicationError(
      'validation',
      'IDEMPOTENCY_KEY_INVALID',
      'A 16 to 120 character Idempotency-Key is required.',
    );
  }
  return value;
}

function expectedVersion(value: string | undefined): number {
  const match = /^"([1-9][0-9]*)"$/.exec(value ?? '');
  const version = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isSafeInteger(version)) {
    throw new ApplicationError(
      'validation',
      'IF_MATCH_INVALID',
      'If-Match must contain a positive version.',
    );
  }
  return version;
}

function money(amountRial: number) {
  return { amountRial, currency: 'IRR' as const, display: formatIrrAsToman(amountRial) };
}

function refundView(refund: RefundRecord) {
  return {
    id: refund.id,
    orderNumber: refund.orderNumber,
    amount: money(refund.amountRial),
    provider: refund.provider,
    providerReference: refund.providerReference,
    status: refund.status,
    requestedAt: refund.requestedAt.toISOString(),
    confirmedAt: refund.confirmedAt?.toISOString() ?? null,
    failureCode: refund.failureCode,
  };
}

function returnView(request: ReturnRecord) {
  return {
    id: request.id,
    orderNumber: request.orderNumber,
    items: request.items,
    reason: request.reason,
    unused: true,
    unwashed: true,
    tagsAttached: true,
    status: request.status,
    requestedAt: request.requestedAt.toISOString(),
    deliveryConfirmedAt: request.deliveryConfirmedAt.toISOString(),
    eligibilityDeadline: request.eligibilityDeadline.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
    decisionReason: request.decisionReason,
    refund: request.refund === null ? null : refundView(request.refund),
  };
}

function eligibility(order: OperationalOrderRecord, now: Date) {
  if (order.deliveredAt === null || !['delivered', 'returned'].includes(order.fulfillmentStatus)) {
    return { eligible: false, deliveredAt: null, deadline: null, code: 'not_delivered' as const };
  }
  const deadline = new Date(order.deliveredAt.getTime() + 24 * 60 * 60 * 1000);
  const used = new Map<string, number>();
  for (const request of order.returns) {
    if (request.status === 'rejected') continue;
    for (const item of request.items)
      used.set(item.orderItemId, (used.get(item.orderItemId) ?? 0) + item.quantity);
  }
  const remaining = order.items.some((item) => (used.get(item.id) ?? 0) < item.quantity);
  if (!remaining) {
    return {
      eligible: false,
      deliveredAt: order.deliveredAt.toISOString(),
      deadline: deadline.toISOString(),
      code: 'no_remaining_quantity' as const,
    };
  }
  if (now.getTime() > deadline.getTime()) {
    return {
      eligible: false,
      deliveredAt: order.deliveredAt.toISOString(),
      deadline: deadline.toISOString(),
      code: 'window_expired' as const,
    };
  }
  return {
    eligible: order.fulfillmentStatus === 'delivered',
    deliveredAt: order.deliveredAt.toISOString(),
    deadline: deadline.toISOString(),
    code:
      order.fulfillmentStatus === 'delivered'
        ? ('eligible' as const)
        : ('no_remaining_quantity' as const),
  };
}

function orderView(order: OperationalOrderRecord, now: Date, admin: boolean) {
  return {
    ...(admin ? { customerId: order.customerId } : {}),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt.toISOString(),
    fulfillmentStatus: order.fulfillmentStatus,
    version: order.version,
    paidTotal: money(order.paidTotalRial),
    itemsSubtotal: money(order.itemsSubtotalRial),
    shippingTotal: money(order.shippingTotalRial),
    items: order.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      selection: item.selection,
      skuCode: item.skuCode,
      outfitRevisionId: item.outfitRevisionId,
      outfitRevisionNumber: item.outfitRevisionNumber,
      outfitSize: item.outfitSize,
      quantity: item.quantity,
      unitPrice: money(item.unitPriceRial),
      lineTotal: money(item.lineTotalRial),
      outfitComponents: item.outfitComponents,
    })),
    address: order.address,
    shipping: {
      method: order.shipping.method,
      name: order.shipping.name,
      chargedPrice: money(order.shipping.chargedPriceRial),
      fixedPrice: money(order.shipping.fixedPriceRial),
      freeShippingApplied: order.shipping.freeShippingApplied,
      freeShippingThreshold:
        order.shipping.freeShippingThresholdRial === null
          ? null
          : money(order.shipping.freeShippingThresholdRial),
      settingsVersion: order.shipping.settingsVersion,
    },
    payment: { provider: 'fake' as const, providerTransactionId: order.providerTransactionId },
    tracking:
      order.tracking === null
        ? null
        : {
            id: order.tracking.id,
            carrier: order.tracking.carrier,
            trackingNumber: order.tracking.trackingNumber,
            trackingUrl: order.tracking.trackingUrl,
            recordedAt: order.tracking.recordedAt.toISOString(),
          },
    timeline: order.timeline.map((event) => ({
      id: event.id,
      type: event.type,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actorId: event.actorId,
      reason: event.reason,
      occurredAt: event.occurredAt.toISOString(),
    })),
    returnEligibility: eligibility(order, now),
    returns: order.returns.map(returnView),
    refunds: order.refunds.map(refundView),
  };
}

function bulkView(operation: BulkOperationRecord) {
  const succeeded = operation.items.filter((item) => item.status === 'applied').length;
  const failed = operation.items.filter((item) => item.status === 'failed').length;
  return {
    id: operation.id,
    kind: operation.kind,
    status: operation.status,
    reason: operation.reason,
    version: operation.version,
    expiresAt: operation.expiresAt.toISOString(),
    createdAt: operation.createdAt.toISOString(),
    appliedAt: operation.appliedAt?.toISOString() ?? null,
    summary: { total: operation.items.length, succeeded, failed },
    items: operation.items,
  };
}

@Controller('me')
@UseGuards(CustomerSessionGuard)
export class CustomerOperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('orders')
  async orders(@Req() request: CustomerRequest) {
    const items = await this.operations.listOwnedOrders(request.customerSession.customer.id);
    return {
      items: items.map((order) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        fulfillmentStatus: order.fulfillmentStatus,
        paidTotal: money(order.paidTotalRial),
        version: order.version,
      })),
      page: { nextCursor: null, hasMore: false },
    };
  }

  @Get('orders/:orderNumber')
  async order(@Req() request: CustomerRequest, @Param('orderNumber') orderNumber: string) {
    return orderView(
      await this.operations.getOwnedOrder(request.customerSession.customer.id, orderNumber),
      this.operations.currentTime(),
      false,
    );
  }

  @Get('returns')
  async returns(@Req() request: CustomerRequest) {
    const items = await this.operations.listOwnedReturns(request.customerSession.customer.id);
    return { items: items.map(returnView), page: { nextCursor: null, hasMore: false } };
  }

  @Post('returns')
  @UseGuards(CustomerCsrfGuard)
  async submitReturn(
    @Req() request: CustomerRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: ReturnSubmissionDto,
  ) {
    return returnView(
      await this.operations.submitReturn(
        request.customerSession.customer.id,
        body.toDomain(),
        requireKey(idempotencyKey),
        correlationId() ?? randomUUID(),
      ),
    );
  }
}

@Controller('admin')
@UseGuards(AdminSessionGuard)
export class AdminOperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('orders')
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async orders(@Query() query: OrdersQueryDto) {
    const items = await this.operations.listAdminOrders(query.status ?? null, query.search ?? null);
    return {
      items: items.map((order) => orderView(order, this.operations.currentTime(), true)),
      page: { nextCursor: null, hasMore: false },
    };
  }

  @Get('orders/:orderNumber')
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async order(@Param('orderNumber') orderNumber: string) {
    return orderView(
      await this.operations.getAdminOrder(orderNumber),
      this.operations.currentTime(),
      true,
    );
  }

  @Post('orders/:orderNumber/transitions')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async transition(
    @Param('orderNumber') orderNumber: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: OrderTransitionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return orderView(
      await this.operations.transitionOrder({
        orderNumber,
        expectedVersion: expectedVersion(ifMatch),
        toStatus: body.toStatus,
        reason: body.reason,
        tracking: body.tracking?.toDomain() ?? null,
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
      this.operations.currentTime(),
      true,
    );
  }

  @Post('orders/:orderNumber/tracking')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async tracking(
    @Param('orderNumber') orderNumber: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: TrackingRevisionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return orderView(
      await this.operations.appendTracking({
        orderNumber,
        expectedVersion: expectedVersion(ifMatch),
        tracking: body.toDomain(),
        reason: body.reason,
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
      this.operations.currentTime(),
      true,
    );
  }

  @Get('returns')
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async returns(@Query() query: ReturnsQueryDto) {
    const items = await this.operations.listReturns(query.status ?? null);
    return { items: items.map(returnView), page: { nextCursor: null, hasMore: false } };
  }

  @Post('returns/:returnId/approve')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async approve(
    @Param('returnId') returnId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: DecisionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return returnView(
      await this.operations.approveReturn({
        returnId,
        reason: body.reason,
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
    );
  }

  @Post('returns/:returnId/reject')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async reject(
    @Param('returnId') returnId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: DecisionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return returnView(
      await this.operations.rejectReturn({
        returnId,
        reason: body.reason,
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
    );
  }

  @Post('refunds/:refundId/retry')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async retryRefund(
    @Param('refundId') refundId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: DecisionDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return refundView(
      await this.operations.retryRefund({
        refundId,
        reason: body.reason,
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
    );
  }

  @Get('audit-events')
  @RequireAdminRoles('super_admin', 'inventory_admin', 'instagram_admin')
  async audit(@Query() query: AuditQueryDto, @Req() request: CatalogAdminRequest) {
    const items = await this.operations.listAuditEvents(
      {
        from: query.from === undefined ? null : new Date(query.from),
        to: query.to === undefined ? null : new Date(query.to),
        eventType: query.eventType ?? null,
        actor: query.actor ?? null,
        entityType: query.entityType ?? null,
        entityId: query.entityId ?? null,
        search: query.search ?? null,
        limit: query.limit ?? 24,
      },
      actorFromRequest(request),
    );
    return {
      items: items.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() })),
      page: { nextCursor: null, hasMore: false },
    };
  }

  @Post('bulk-operations/price/preview')
  @RequireAdminRoles('super_admin')
  async previewPrice(@Body() body: PriceBulkPreviewDto, @Req() request: CatalogAdminRequest) {
    return bulkView(
      await this.operations.previewPriceBulk({
        filters: body.filters.toDomain(),
        adjustment: body.adjustment,
        reason: body.reason,
        actor: actorFromRequest(request),
      }),
    );
  }

  @Post('bulk-operations/inventory/preview')
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async previewInventory(
    @Body() body: InventoryBulkPreviewDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return bulkView(
      await this.operations.previewInventoryBulk({
        filters: body.filters.toDomain(),
        action: body.action,
        quantity: body.quantity,
        reason: body.reason,
        actor: actorFromRequest(request),
      }),
    );
  }

  @Get('bulk-operations/:bulkOperationId')
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async bulk(@Param('bulkOperationId') id: string, @Req() request: CatalogAdminRequest) {
    return bulkView(await this.operations.getBulkOperation(id, actorFromRequest(request)));
  }

  @Post('bulk-operations/:bulkOperationId/apply')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRoles('super_admin', 'inventory_admin')
  async applyBulk(
    @Param('bulkOperationId') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return bulkView(
      await this.operations.applyBulkOperation({
        id,
        expectedVersion: expectedVersion(ifMatch),
        idempotencyKey: requireKey(idempotencyKey),
        actor: actorFromRequest(request),
      }),
    );
  }
}
