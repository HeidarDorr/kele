import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
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
import { CheckoutService } from '../application/checkout.service.js';
import { PaymentService } from '../application/payment.service.js';
import { OrderService } from '../application/order.service.js';
import {
  CheckoutSessionDto,
  FakePaymentCallbackDto,
  FakePaymentCompletionDto,
  ShippingSettingsDto,
} from './checkout.dto.js';
import { PaymentCallbackRateLimitGuard } from '../../../platform/security/abuse-rate-limit.guards.js';
import { environment } from '../../../platform/config/environment.js';

function requireIdempotencyKey(value: string | undefined): string {
  if (value === undefined || value.length < 16 || value.length > 120) {
    throw new ApplicationError(
      'validation',
      'IDEMPOTENCY_KEY_INVALID',
      'Idempotency-Key must contain between 16 and 120 characters.',
    );
  }
  return value;
}

function requireSignature(value: string | undefined): string {
  if (value === undefined || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new ApplicationError(
      'forbidden',
      'PAYMENT_CALLBACK_UNVERIFIED',
      'Payment callback signature is missing or invalid.',
    );
  }
  return value;
}

function parseVersion(value: string | undefined): number {
  if (value === undefined || !/^"[0-9]+"$/.test(value)) {
    throw new ApplicationError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match must be a quoted settings version.',
    );
  }
  return Number(value.slice(1, -1));
}

function resolvedCorrelationId(): string {
  return correlationId() ?? randomUUID();
}

@Controller('shipping-options')
@UseGuards(CustomerSessionGuard)
export class ShippingController {
  constructor(private readonly checkouts: CheckoutService) {}

  @Get()
  listOptions(
    @Req() request: CustomerRequest,
    @Query('cartId', new ParseUUIDPipe()) cartId: string,
    @Query('addressId', new ParseUUIDPipe()) addressId: string,
  ) {
    return this.checkouts.listShippingOptions(
      request.customerSession.customer.id,
      cartId,
      addressId,
    );
  }
}

@Controller()
export class CheckoutController {
  constructor(
    private readonly checkouts: CheckoutService,
    private readonly payments: PaymentService,
  ) {}

  @Post('checkout-sessions')
  @UseGuards(CustomerSessionGuard, CustomerCsrfGuard)
  createCheckout(
    @Req() request: CustomerRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CheckoutSessionDto,
  ) {
    return this.checkouts.createCheckout({
      customerId: request.customerSession.customer.id,
      cartId: body.cartId,
      addressId: body.addressId,
      deliveryMethod: body.deliveryMethod,
      idempotencyKey: requireIdempotencyKey(idempotencyKey),
      correlationId: resolvedCorrelationId(),
    });
  }

  @Get('checkout-sessions/:checkoutSessionId')
  @UseGuards(CustomerSessionGuard)
  getCheckout(
    @Req() request: CustomerRequest,
    @Param('checkoutSessionId', new ParseUUIDPipe()) checkoutSessionId: string,
  ) {
    return this.checkouts.getCheckout(request.customerSession.customer.id, checkoutSessionId);
  }

  @Post('checkout-sessions/:checkoutSessionId/payment-attempts')
  @UseGuards(CustomerSessionGuard, CustomerCsrfGuard)
  startPayment(
    @Req() request: CustomerRequest,
    @Param('checkoutSessionId', new ParseUUIDPipe()) checkoutSessionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.payments.startPayment({
      customerId: request.customerSession.customer.id,
      checkoutSessionId,
      idempotencyKey: requireIdempotencyKey(idempotencyKey),
      correlationId: resolvedCorrelationId(),
    });
  }

  @Get('payment-attempts/:paymentAttemptId')
  @UseGuards(CustomerSessionGuard)
  getPayment(
    @Req() request: CustomerRequest,
    @Param('paymentAttemptId', new ParseUUIDPipe()) paymentAttemptId: string,
  ) {
    return this.payments.getPayment(request.customerSession.customer.id, paymentAttemptId);
  }

  @Post('fake-payment-attempts/:paymentAttemptId/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerSessionGuard, CustomerCsrfGuard)
  completeFakePayment(
    @Req() request: CustomerRequest,
    @Param('paymentAttemptId', new ParseUUIDPipe()) paymentAttemptId: string,
    @Body() body: FakePaymentCompletionDto,
  ) {
    return this.payments.completeFakePayment(
      request.customerSession.customer.id,
      paymentAttemptId,
      body.outcome,
      resolvedCorrelationId(),
    );
  }

  @Post('payment-callbacks/:provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PaymentCallbackRateLimitGuard)
  processCallback(
    @Param('provider') provider: string,
    @Headers('x-payment-signature') signature: string | undefined,
    @Body() body: FakePaymentCallbackDto,
  ) {
    if (provider !== 'fake') {
      throw new ApplicationError(
        'validation',
        'PAYMENT_PROVIDER_UNSUPPORTED',
        'Payment provider is unsupported.',
      );
    }
    return this.payments.processCallback(
      'fake',
      requireSignature(signature),
      body.toDomain(),
      resolvedCorrelationId(),
    );
  }

  @Get('payment-callbacks/vandar')
  @UseGuards(PaymentCallbackRateLimitGuard)
  async processVandarCallback(
    @Query('token') token: string | undefined,
    @Query('payment_status') paymentStatus: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    if (
      typeof token !== 'string' ||
      token.length < 8 ||
      token.length > 256 ||
      (paymentStatus !== 'OK' && paymentStatus !== 'NOK')
    ) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_UNVERIFIED',
        'Payment callback payload failed validation.',
      );
    }
    const outcome = await this.payments.processCallback(
      'vandar',
      token,
      { token, paymentStatus },
      resolvedCorrelationId(),
    );
    const resultUrl = new URL('/payment/result', environment.STOREFRONT_ORIGIN);
    resultUrl.searchParams.set('attempt', outcome.paymentAttemptId);
    response.redirect(HttpStatus.SEE_OTHER, resultUrl.toString());
  }
}

@Controller('admin/settings/shipping')
@UseGuards(AdminSessionGuard)
@RequireAdminRoles('super_admin')
export class AdminShippingController {
  constructor(private readonly checkouts: CheckoutService) {}

  @Get()
  async getSettings() {
    const settings = await this.checkouts.getShippingSettings();
    if (settings === null) {
      throw new ApplicationError(
        'not_found',
        'SHIPPING_SETTINGS_NOT_FOUND',
        'Shipping settings were not found.',
      );
    }
    return this.toView(settings);
  }

  @Patch()
  updateSettings(
    @Req() request: CatalogAdminRequest,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: ShippingSettingsDto,
  ) {
    const actor = actorFromRequest(request);
    return this.checkouts
      .publishShippingSettings({
        freeShippingThresholdRial: body.freeShippingThresholdRial ?? null,
        methods: body.methods,
        actorId: actor.actorId,
        correlationId: actor.correlationId,
        reason: body.reason,
        expectedVersion: parseVersion(ifMatch),
      })
      .then((settings) => this.toView(settings));
  }

  private toView(settings: Awaited<ReturnType<CheckoutService['getShippingSettings']>>) {
    if (settings === null) throw new Error('Shipping settings view requires an effective version.');
    return {
      version: settings.version,
      effectiveAt: settings.effectiveAt.toISOString(),
      eligibilityBasis: settings.eligibilityBasis,
      freeShippingThresholdRial: settings.freeShippingThresholdRial,
      reason: settings.reason,
      methods: settings.methods.map((method) => ({
        code: method.code,
        enabled: method.enabled,
        fixedPriceRial: method.fixedPriceRial,
      })),
    };
  }
}

@Controller('me/orders')
@UseGuards(CustomerSessionGuard)
export class CustomerOrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  list(@Req() request: CustomerRequest) {
    return this.orders.listOrders(request.customerSession.customer.id);
  }

  @Get(':orderNumber')
  get(@Req() request: CustomerRequest, @Param('orderNumber') orderNumber: string) {
    if (orderNumber.length < 1 || orderNumber.length > 40) {
      throw new ApplicationError('not_found', 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    return this.orders.getOrder(request.customerSession.customer.id, orderNumber);
  }
}
