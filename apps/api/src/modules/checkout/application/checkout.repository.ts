import type {
  AddressSnapshot,
  CallbackReceiptRecord,
  CheckoutLineRecord,
  CheckoutSessionRecord,
  DatabaseJobRecord,
  PaymentAttemptRecord,
  PaymentCallbackOutcome,
  OrderSnapshotRecord,
  ReservationRecord,
  ShippingMethodCodeValue,
  ShippingMethodSetting,
  ShippingSettingsRecord,
  VerifiedPaymentCallback,
} from '../domain/checkout.types.js';

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY');

export type CreateCheckoutInput = Readonly<{
  id: string;
  customerId: string;
  cartId: string;
  cartVersion: number;
  idempotencyKey: string;
  requestHash: string;
  itemsSubtotalRial: number;
  shippingTotalRial: number;
  payableTotalRial: number;
  address: AddressSnapshot;
  shipping: Readonly<{
    method: ShippingMethodCodeValue;
    name: string;
    fixedPriceRial: number;
    freeShippingThresholdRial: number | null;
    freeShippingApplied: boolean;
    settingsVersion: number;
  }>;
  createdAt: Date;
  expiresAt: Date;
  lines: readonly CheckoutLineRecord[];
  reservations: readonly ReservationRecord[];
}>;

export type CreatePaymentAttemptInput = Readonly<{
  id: string;
  checkoutSessionId: string;
  provider: string;
  providerReference: string;
  amountRial: number;
  redirectUrl: string;
  idempotencyKey: string;
  requestHash: string;
  createdAt: Date;
}>;

export type CreateOrderInput = Readonly<{
  id: string;
  orderNumber: string;
  checkout: CheckoutSessionRecord;
  paymentAttempt: PaymentAttemptRecord;
  callback: VerifiedPaymentCallback;
  paidAt: Date;
}>;

export interface CheckoutRepository {
  getEffectiveShippingSettings(now: Date): Promise<ShippingSettingsRecord | null>;
  createShippingSettings(input: {
    freeShippingThresholdRial: number | null;
    methods: readonly ShippingMethodSetting[];
    actorId: string;
    correlationId: string;
    reason: string;
    effectiveAt: Date;
  }): Promise<ShippingSettingsRecord>;
  findCheckoutReplay(
    customerId: string,
    idempotencyKey: string,
  ): Promise<CheckoutSessionRecord | null>;
  findOpenCheckoutForCart(cartId: string): Promise<CheckoutSessionRecord | null>;
  createCheckout(input: CreateCheckoutInput, correlationId: string): Promise<CheckoutSessionRecord>;
  getOwnedCheckout(customerId: string, checkoutSessionId: string): Promise<CheckoutSessionRecord>;
  lockCheckout(checkoutSessionId: string): Promise<CheckoutSessionRecord | null>;
  markCheckoutExpired(checkoutSessionId: string, now: Date, correlationId: string): Promise<void>;
  markCheckoutCancelled(checkoutSessionId: string, now: Date, correlationId: string): Promise<void>;
  findPaymentAttemptReplay(
    checkoutSessionId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttemptRecord | null>;
  createPaymentAttempt(input: CreatePaymentAttemptInput): Promise<PaymentAttemptRecord>;
  getOwnedPaymentAttempt(
    customerId: string,
    paymentAttemptId: string,
  ): Promise<PaymentAttemptRecord>;
  getPaymentAttemptForRecovery(paymentAttemptId: string): Promise<PaymentAttemptRecord | null>;
  lockPaymentAttemptByProviderReference(
    provider: string,
    providerReference: string,
  ): Promise<PaymentAttemptRecord | null>;
  findCallbackReceipt(
    provider: string,
    providerEventId: string,
  ): Promise<CallbackReceiptRecord | null>;
  recordNonSuccessCallback(input: {
    paymentAttempt: PaymentAttemptRecord;
    callback: VerifiedPaymentCallback;
    outcome: Exclude<PaymentCallbackOutcome['status'], 'paid' | 'reconciliation'>;
    now: Date;
  }): Promise<PaymentCallbackOutcome>;
  recordExistingPaidCallback(input: {
    paymentAttempt: PaymentAttemptRecord;
    callback: VerifiedPaymentCallback;
    now: Date;
  }): Promise<PaymentCallbackOutcome>;
  createOrder(input: CreateOrderInput): Promise<{ id: string; orderNumber: string }>;
  completePaidOrder(input: {
    orderId: string;
    orderNumber: string;
    checkoutSessionId: string;
    paymentAttemptId: string;
    callback: VerifiedPaymentCallback;
    paidAt: Date;
    correlationId: string;
  }): Promise<PaymentCallbackOutcome>;
  createReconciliation(input: {
    checkout: CheckoutSessionRecord;
    paymentAttempt: PaymentAttemptRecord;
    callback: VerifiedPaymentCallback;
    reason: string;
    now: Date;
    correlationId: string;
  }): Promise<PaymentCallbackOutcome>;
  listOwnedOrders(customerId: string): Promise<OrderSnapshotRecord[]>;
  getOwnedOrder(customerId: string, orderNumber: string): Promise<OrderSnapshotRecord>;
  claimJobs(
    workerId: string,
    now: Date,
    leaseUntil: Date,
    limit: number,
  ): Promise<DatabaseJobRecord[]>;
  completeJob(jobId: string, workerId: string, now: Date): Promise<void>;
  retryJob(input: {
    job: DatabaseJobRecord;
    workerId: string;
    now: Date;
    nextRunAt: Date;
    errorCode: string;
    safeError: string;
  }): Promise<void>;
}
