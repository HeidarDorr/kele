import { createHash, randomUUID } from 'node:crypto';
import { formatIrrAsToman } from '@kele/design-system/money';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import type { IdFactory } from '../../../shared/deterministic-runtime.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CheckoutCartPort } from '../../cart/application/checkout-cart.contract.js';
import type { CheckoutCatalogPort } from '../../catalog/application/checkout-catalog.contract.js';
import type { PaymentGateway } from '../../foundation/application/payment-gateway.port.js';
import type { FakePaymentSimulator } from '../../foundation/application/fake-payment-simulator.port.js';
import type { CheckoutRepository } from './checkout.repository.js';
import type {
  PaymentAttemptRecord,
  PaymentAttemptView,
  PaymentCallbackOutcome,
} from '../domain/checkout.types.js';
import {
  noOperationalTelemetry,
  type OperationalTelemetry,
} from '../../../shared/operational-telemetry.js';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function paymentView(attempt: PaymentAttemptRecord): PaymentAttemptView {
  return {
    id: attempt.id,
    checkoutSessionId: attempt.checkoutSessionId,
    provider: attempt.provider,
    status: attempt.status,
    amount: {
      amountRial: attempt.amountRial,
      currency: 'IRR',
      display: formatIrrAsToman(attempt.amountRial),
    },
    redirectUrl: attempt.redirectUrl,
    orderNumber: attempt.orderNumber,
    reconciliationReason: attempt.reconciliationReason,
    createdAt: attempt.createdAt.toISOString(),
  };
}

export class PaymentService {
  constructor(
    private readonly repository: CheckoutRepository,
    private readonly gateway: PaymentGateway,
    private readonly simulator: FakePaymentSimulator,
    private readonly catalog: CheckoutCatalogPort,
    private readonly carts: CheckoutCartPort,
    private readonly unitOfWork: UnitOfWork,
    private readonly returnBaseUrl: string,
    private readonly clock: () => Date = () => new Date(),
    private readonly idFactory: IdFactory = randomUUID,
    private readonly telemetry: OperationalTelemetry = noOperationalTelemetry,
  ) {}

  async startPayment(input: {
    customerId: string;
    checkoutSessionId: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<PaymentAttemptView> {
    const requestHash = hash(`${input.customerId}:${input.checkoutSessionId}`);
    const replay = await this.repository.findPaymentAttemptReplay(
      input.checkoutSessionId,
      input.idempotencyKey,
    );
    if (replay !== null) {
      if (replay.customerId !== input.customerId) this.notFound();
      if (replay.requestHash !== requestHash) this.idempotencyConflict();
      return paymentView(replay);
    }
    const observedCheckout = await this.repository.getOwnedCheckout(
      input.customerId,
      input.checkoutSessionId,
    );
    this.assertCheckoutPayable(observedCheckout.status, observedCheckout.expiresAt);
    const paymentAttemptId = this.idFactory();
    const applicationReference = hash(`${input.checkoutSessionId}:${input.idempotencyKey}`).slice(
      0,
      48,
    );
    let intent: Awaited<ReturnType<PaymentGateway['createIntent']>>;
    try {
      intent = await this.gateway.createIntent({
        applicationReference,
        paymentAttemptId,
        amountRial: observedCheckout.payableTotalRial,
        currency: 'IRR',
        returnBaseUrl: this.returnBaseUrl,
        correlationId: input.correlationId,
      });
      this.telemetry.record({
        name: 'payment_provider',
        outcome: 'intent_created',
        provider: intent.provider,
      });
    } catch {
      this.telemetry.record({
        name: 'payment_provider',
        outcome: 'intent_failed',
        provider: this.gateway.provider,
      });
      throw new ApplicationError(
        'dependency',
        'PAYMENT_PROVIDER_UNAVAILABLE',
        'Payment initiation is temporarily unavailable.',
      );
    }

    return this.unitOfWork.run(async () => {
      const concurrentReplay = await this.repository.findPaymentAttemptReplay(
        input.checkoutSessionId,
        input.idempotencyKey,
      );
      if (concurrentReplay !== null) {
        if (concurrentReplay.customerId !== input.customerId) this.notFound();
        if (concurrentReplay.requestHash !== requestHash) this.idempotencyConflict();
        return paymentView(concurrentReplay);
      }
      const checkout = await this.repository.lockCheckout(input.checkoutSessionId);
      if (checkout === null || checkout.customerId !== input.customerId) this.notFound();
      this.assertCheckoutPayable(checkout.status, checkout.expiresAt);
      if (checkout.payableTotalRial !== observedCheckout.payableTotalRial) {
        throw new ApplicationError(
          'conflict',
          'CHECKOUT_QUOTE_CHANGED',
          'Checkout quote changed before payment started.',
        );
      }
      return paymentView(
        await this.repository.createPaymentAttempt({
          id: paymentAttemptId,
          checkoutSessionId: checkout.id,
          provider: intent.provider,
          providerReference: intent.reference,
          amountRial: checkout.payableTotalRial,
          redirectUrl: intent.redirectUrl,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          createdAt: this.clock(),
        }),
      );
    });
  }

  async getPayment(customerId: string, paymentAttemptId: string): Promise<PaymentAttemptView> {
    return paymentView(await this.repository.getOwnedPaymentAttempt(customerId, paymentAttemptId));
  }

  async completeFakePayment(
    customerId: string,
    paymentAttemptId: string,
    outcome: 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount',
    correlationId: string,
  ): Promise<PaymentCallbackOutcome> {
    const attempt = await this.repository.getOwnedPaymentAttempt(customerId, paymentAttemptId);
    const callback = this.simulator.simulateCallback(attempt, outcome, this.clock());
    return this.processCallback('fake', callback.signature, callback.payload, correlationId);
  }

  async processCallback(
    provider: string,
    signature: string,
    payload: unknown,
    correlationId: string,
  ): Promise<PaymentCallbackOutcome> {
    const now = this.clock();
    try {
      if (provider !== this.gateway.provider) {
        throw new ApplicationError(
          'validation',
          'PAYMENT_PROVIDER_UNSUPPORTED',
          'Payment provider is unsupported.',
        );
      }
      const callback = await this.gateway.verifyCallback({ signature, payload, now });
      const outcome = await this.unitOfWork.run(async () => {
        const prior = await this.repository.findCallbackReceipt(provider, callback.nonce);
        if (prior !== null) return this.requireExactReplay(prior, callback.payloadHash);

        const attempt = await this.repository.lockPaymentAttemptByProviderReference(
          provider,
          callback.providerReference,
        );
        if (attempt === null) {
          throw new ApplicationError(
            'forbidden',
            'PAYMENT_CALLBACK_UNMATCHED',
            'Verified callback does not match a known payment attempt.',
          );
        }
        const serializedReplay = await this.repository.findCallbackReceipt(
          provider,
          callback.nonce,
        );
        if (serializedReplay !== null) {
          return this.requireExactReplay(serializedReplay, callback.payloadHash);
        }
        if (attempt.orderNumber !== null) {
          if (
            attempt.providerTransactionId !== null &&
            attempt.providerTransactionId !== callback.providerTransactionId
          ) {
            throw new ApplicationError(
              'conflict',
              'PAYMENT_TRANSACTION_MISMATCH',
              'A paid payment attempt cannot accept a different provider transaction.',
            );
          }
          return this.repository.recordExistingPaidCallback({
            paymentAttempt: attempt,
            callback,
            now,
          });
        }
        const checkout = await this.requireCheckout(attempt.checkoutSessionId);
        if (
          attempt.providerTransactionId !== null &&
          attempt.providerTransactionId !== callback.providerTransactionId
        ) {
          return this.repository.createReconciliation({
            checkout,
            paymentAttempt: attempt,
            callback,
            reason: 'PROVIDER_TRANSACTION_MISMATCH',
            now,
            correlationId,
          });
        }
        if (callback.amountRial !== attempt.amountRial) {
          return this.repository.createReconciliation({
            checkout,
            paymentAttempt: attempt,
            callback,
            reason: 'PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH',
            now,
            correlationId,
          });
        }
        if (callback.status !== 'success') {
          return this.repository.recordNonSuccessCallback({
            paymentAttempt: attempt,
            callback,
            outcome:
              callback.status === 'failed'
                ? 'failed'
                : callback.status === 'cancelled'
                  ? 'cancelled'
                  : 'pending',
            now,
          });
        }

        const activeReservations = checkout.reservations.filter(
          (reservation) => reservation.status === 'active',
        );
        const expectedReservations = checkout.lines.flatMap((line) => {
          if (line.kind === 'product') {
            return line.skuId === null
              ? []
              : [{ checkoutLineId: line.id, skuId: line.skuId, quantity: line.quantity }];
          }
          const bySku = new Map<string, number>();
          for (const component of line.outfitComponents) {
            bySku.set(component.skuId, (bySku.get(component.skuId) ?? 0) + component.totalQuantity);
          }
          return [...bySku.entries()].map(([skuId, quantity]) => ({
            checkoutLineId: line.id,
            skuId,
            quantity,
          }));
        });
        const completeReservationSet =
          expectedReservations.length === activeReservations.length &&
          expectedReservations.every((expected) =>
            activeReservations.some(
              (reservation) =>
                reservation.checkoutLineId === expected.checkoutLineId &&
                reservation.skuId === expected.skuId &&
                reservation.quantity === expected.quantity,
            ),
          );
        if (
          !['active', 'payment_pending'].includes(checkout.status) ||
          checkout.expiresAt <= now ||
          !completeReservationSet
        ) {
          return this.repository.createReconciliation({
            checkout,
            paymentAttempt: attempt,
            callback,
            reason: 'RESERVATION_INACTIVE_OR_INCOMPLETE',
            now,
            correlationId,
          });
        }

        const orderId = this.idFactory();
        const orderNumber = this.idFactory();
        const order = await this.repository.createOrder({
          id: orderId,
          orderNumber,
          checkout,
          paymentAttempt: attempt,
          callback,
          paidAt: now,
        });
        await this.catalog.consume(
          activeReservations.map((reservation) => ({
            reservationId: reservation.id,
            checkoutSessionId: reservation.checkoutSessionId,
            skuId: reservation.skuId,
            quantity: reservation.quantity,
          })),
          { actorId: `payment:${provider}`, correlationId },
          order.id,
        );
        await this.carts.completePurchasedLines(
          checkout.customerId,
          checkout.cartId,
          checkout.lines.map((line) => ({
            cartLineId: line.cartLineId,
            quantity: line.quantity,
          })),
        );
        return this.repository.completePaidOrder({
          orderId: order.id,
          orderNumber: order.orderNumber,
          checkoutSessionId: checkout.id,
          paymentAttemptId: attempt.id,
          callback,
          paidAt: now,
          correlationId,
        });
      });
      this.telemetry.record({
        name: 'payment_callback',
        outcome: outcome.status,
        provider,
      });
      return outcome;
    } catch (error: unknown) {
      this.telemetry.record({
        name: 'payment_callback',
        outcome: error instanceof ApplicationError ? error.code.toLowerCase() : 'failed',
        provider,
      });
      throw error;
    }
  }

  private async requireCheckout(checkoutSessionId: string) {
    const checkout = await this.repository.lockCheckout(checkoutSessionId);
    if (checkout === null) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_UNMATCHED',
        'Verified callback does not match an existing CheckoutSession.',
      );
    }
    return checkout;
  }

  private requireExactReplay(
    receipt: { payloadHash: string; outcome: PaymentCallbackOutcome },
    payloadHash: string,
  ): PaymentCallbackOutcome {
    if (receipt.payloadHash !== payloadHash) {
      throw new ApplicationError(
        'conflict',
        'PAYMENT_CALLBACK_EVENT_COLLISION',
        'Provider event identifier was reused with a different callback payload.',
      );
    }
    return receipt.outcome;
  }

  private assertCheckoutPayable(status: string, expiresAt: Date): void {
    if (status !== 'active') {
      throw new ApplicationError(
        'conflict',
        'CHECKOUT_NOT_PAYABLE',
        'Checkout is not active for a new payment attempt.',
      );
    }
    if (expiresAt <= this.clock()) {
      throw new ApplicationError('conflict', 'CHECKOUT_EXPIRED', 'Checkout has expired.');
    }
  }

  private idempotencyConflict(): never {
    throw new ApplicationError(
      'conflict',
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency key was already used with a different payment command.',
    );
  }

  private notFound(): never {
    throw new ApplicationError('not_found', 'PAYMENT_NOT_FOUND', 'Payment was not found.');
  }
}
